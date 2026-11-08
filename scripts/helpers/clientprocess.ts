import {execFileSync} from "node:child_process";
import type {InjectionChannel} from "./injection";

type StopOptions = {
    platform?: NodeJS.Platform;
    wsl?: boolean;
    uid?: number;
    execute?: typeof execFileSync;
    signal?: typeof process.kill;
};

/** Stop only the selected client; never launch it. */
export function stopClient(channel: InjectionChannel, options: StopOptions = {}) {
    const platform = options.platform ?? process.platform;
    const wsl = options.wsl ?? Boolean(process.env.WSL_DISTRO_NAME);
    const execute = options.execute ?? execFileSync;
    const signal = options.signal ?? process.kill;
    const uid = options.uid ?? process.getuid?.();
    const app = channel === "canary" ? "Discord Canary" : channel === "ptb" ? "Discord PTB" : "Discord";
    const executable = app.replaceAll(" ", "");

    if (platform === "win32" || wsl) {
        const script = `
$ErrorActionPreference = 'Stop'
$session = (Get-Process -Id $PID).SessionId
$user = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$name = '${executable}'
function Get-SelectedClient {
    $candidates = @(Get-Process -ErrorAction Stop | Where-Object { $_.ProcessName -ieq $name -and $_.SessionId -eq $session })
    foreach ($candidate in $candidates) {
        $process = Get-CimInstance Win32_Process -Filter "ProcessId = $($candidate.Id)" -ErrorAction Stop
        $owner = Invoke-CimMethod -InputObject $process -MethodName GetOwner -ErrorAction Stop
        if ($owner.ReturnValue -ne 0) { throw 'Cannot determine selected Discord process owner.' }
        if (("$($owner.Domain)\\$($owner.User)") -ieq $user) { $candidate }
    }
}
$clients = @(Get-SelectedClient)
if ($clients.Count -eq 0) { exit 0 }
$clients | Stop-Process -ErrorAction Stop
for ($i = 0; $i -lt 20; $i++) {
    if (@(Get-SelectedClient).Count -eq 0) { exit 0 }
    Start-Sleep -Milliseconds 250
}
throw 'Selected Discord client is still running; close it manually.'
`;
        execute("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {stdio: "inherit"});
        return;
    }
    if (uid == null) throw new Error("Cannot determine the current user for Discord process lookup");

    const pids = () => {
        const output = execute("/bin/ps", ["-ww", "-u", String(uid), "-o", "pid=,comm="], {encoding: "utf8"});
        return String(output).split("\n").flatMap(line => {
            const match = line.trim().match(/^(\d+)\s+(.+)$/);
            if (!match) return [];
            const command = match[2];
            const selected = platform === "darwin"
                ? command.startsWith(`/Applications/${app}.app/Contents/MacOS/`)
                : command.split("/").pop()?.toLowerCase() === executable.toLowerCase();
            return selected ? [Number(match[1])] : [];
        });
    };
    const send = (pid: number, sig: NodeJS.Signals) => {
        try {signal(pid, sig);}
        catch (error) {if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;}
    };
    const wait = (attempts: number) => {
        for (let attempt = 0; attempt < attempts; attempt++) {
            if (!pids().length) return true;
            execute("/bin/sleep", ["0.5"]);
        }
        return !pids().length;
    };

    const initial = pids();
    if (!initial.length) return;
    if (platform === "darwin") {
        try {execute("/usr/bin/osascript", ["-e", `tell application "${app}" to quit`], {stdio: "ignore"});}
        catch {/* A missing AppleScript response still permits signal fallback. */}
        if (wait(40)) return;
    }
    for (const pid of pids()) send(pid, "SIGTERM");
    if (wait(20)) return;
    if (platform === "darwin") {
        for (const pid of pids()) send(pid, "SIGKILL");
        if (wait(20)) return;
    }
    throw new Error(`${app} is still running; close it manually before continuing`);
}
