import {expect, test} from "bun:test";
import {stopClient} from "../../scripts/helpers/clientprocess";

test("macOS only quits the selected running bundle and never launches an absent client", () => {
    const calls: Array<[string, string[]]> = []; let checks = 0;
    const execute = ((file: string, args: string[]) => {
        calls.push([file, args]);
        if (file === "/bin/ps") return ++checks === 1 ? "11 /Applications/Discord PTB.app/Contents/MacOS/Discord PTB\n12 /Applications/Discord Canary.app/Contents/MacOS/Discord Canary\n" : "";
        return "";
    }) as any;
    stopClient("ptb", {platform: "darwin", wsl: false, uid: 501, execute});
    expect(calls.filter(([file]) => file === "/usr/bin/osascript")).toEqual([["/usr/bin/osascript", ["-e", "tell application \"Discord PTB\" to quit"]]]);
    expect(calls.find(([file]) => file === "/bin/ps")?.[1]).toContain("501");
    const absentCalls: string[] = []; const absentSignals: number[] = [];
    stopClient("stable", {platform: "darwin", wsl: false, uid: 501, execute: ((file: string) => {absentCalls.push(file); return "";}) as any, signal: ((pid: number) => {absentSignals.push(pid); return true;}) as any});
    expect(absentCalls).toEqual(["/bin/ps"]); expect(absentSignals).toEqual([]);
});

test("Linux signals only the exact selected current-user client", () => {
    const signals: Array<[number, string]> = []; let checks = 0;
    const execute = ((file: string) => file === "/bin/ps" && ++checks < 3 ? "31 /usr/bin/DiscordPTB\n32 /usr/bin/discordcanary\n33 /usr/bin/discord\n" : "") as any;
    stopClient("canary", {platform: "linux", wsl: false, uid: 1000, execute, signal: ((pid: number, sig: string) => {signals.push([pid, sig]); return true;}) as any});
    expect(signals).toEqual([[32, "SIGTERM"]]);
});

test("Windows and WSL use selected current-session PowerShell and surface lookup errors", () => {
    for (const platform of ["win32", "linux"] as const) {
        const calls: Array<[string, string[]]> = [];
        stopClient("ptb", {platform, wsl: platform === "linux", execute: ((file: string, args: string[]) => {calls.push([file, args]); return "";}) as any});
        expect(calls[0][0]).toBe("powershell.exe"); expect(calls[0][1].at(-1)).toContain("'DiscordPTB'"); expect(calls[0][1].at(-1)).toContain("SessionId"); expect(calls[0][1].at(-1)).toContain("Get-Process -ErrorAction Stop"); expect(calls[0][1].at(-1)).toContain("WindowsIdentity"); expect(calls[0][1].at(-1)).toContain("GetOwner");
    }
    expect(() => stopClient("stable", {platform: "linux", wsl: false, uid: 1000, execute: (() => {throw new Error("lookup failed");}) as any})).toThrow("lookup failed");
});
