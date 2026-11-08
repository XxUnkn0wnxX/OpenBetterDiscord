import React from "react";
import {lucideToDiscordIcon} from "@utils/icon";
import clsx from "clsx";
import {Icon, type LucideProps} from "lucide-react";

type Props = Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement> & {accent?: boolean; secondaryColor?: React.CSSProperties["color"];};
type PsuedoLucideIcon = React.ForwardRefExoticComponent<Props>;

const IconRenderer: React.FC<React.ComponentProps<typeof Icon>> = typeof (Icon as any).render === "function"
    ? (Icon as unknown as {render: React.FC<React.ComponentProps<typeof Icon>>;}).render
    : Icon;


const makeNode = (d: string, color: React.CSSProperties["color"] | undefined | null): [elementName: "circle" | "ellipse" | "g" | "line" | "path" | "polygon" | "polyline" | "rect", attrs: Record<string, string>] => {
    const nProps: Record<string, string> = {d};

    if (typeof color === "string") nProps.fill = color;

    return [
        "path",
        nProps
    ];
};

const BDLogo = ((props: Props) => {
    const element = IconRenderer(
        {
            ...props,
            strokeWidth: props.strokeWidth ?? (props.accent ? 1.254 : 0),
            className: clsx("lucide-betterdiscord", props.className),
            iconNode: [
                makeNode(
                    "M 717,128 C 866,116 1021,173 1104,277 C 1185,375 1193,484 1193,625 C 1193,769 1185,879 1104,977 C 1021,1082 866,1136 718,1128 C 853,1038 928,956 928,809 L 928,439 C 928,292 853,208 717,128 Z",
                    props.secondaryColor || props.color || "currentcolor"
                ),
                makeNode(
                    "M 487,127 C 703,117 845,239 886,392 C 909,478 885,567 803,622 C 874,680 905,772 894,860 C 873,1035 719,1132 487,1128 C 618,1049 692,940 692,813 L 692,438 C 692,309 616,194 487,127 Z",
                    props.accent ? "none" : props.color || "currentcolor"
                ),
                makeNode(
                    "M 61,245 C 155,147 269,122 367,122 C 549,122 668,247 668,443 L 668,810 C 668,1018 547,1131 356,1131 C 165,1131 59,1023 59,815 L 59,454 L 260,454 L 260,807 C 260,865 298,905 351,907 L 375,907 C 426,907 468,870 468,813 L 468,439 C 468,383 433,342 378,342 L 315,342 C 286,342 259,354 237,378 Z",
                    props.accent ? "none" : props.color || "currentcolor"
                )
            ]
        },
        // @ts-expect-error Ignore cause react 19
        props.ref
    ) as React.ReactElement<any, any>;

    return React.cloneElement(element, {
        viewBox: "0 0 1254 1254",
        enableBackground: "new 0 0 1254 1254",
        stoke: undefined
    });
}) as PsuedoLucideIcon;

export const Logo = Object.assign(BDLogo, {
    Discord: lucideToDiscordIcon(BDLogo),
    DiscordAccented: lucideToDiscordIcon(BDLogo, (m) => ({...m, accent: true}))
});
