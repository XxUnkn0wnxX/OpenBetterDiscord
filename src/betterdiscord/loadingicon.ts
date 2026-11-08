import loadingIconSvg from "@assets/svgs/obd-loading-indicator.svg";

const loadingIconData = `data:image/svg+xml,${encodeURIComponent(loadingIconSvg)}`;

const css = `/* BEGIN V2 LOADER */
/* =============== */

#bd-loading-icon {
  background-image: url("${loadingIconData}");
}
#bd-loading-icon {
  position: fixed;
  bottom:5px;
  right:5px;
  z-index: 2147483647;
  display: block;
  width: 20px;
  height: 20px;
  background-size: 100% 100%;
  animation: bd-loading-animation 1.5s ease-in-out infinite;
}

@keyframes bd-loading-animation {
  0% { opacity: 0.05; }
  50% { opacity: 0.6; }
  100% { opacity: 0.05; }
}
/* =============== */
/*  END V2 LOADER  */`;

const iconStyle = document.createElement("style");
iconStyle.textContent = css;

const loadingIcon = document.createElement("div");
loadingIcon.id = "bd-loading-icon";
loadingIcon.className = "bd-loaderv2";
loadingIcon.title = "Open BetterDiscord is loading...";

export default class {
    static show() {
        document.body.appendChild(iconStyle);
        document.body.appendChild(loadingIcon);
    }

    static hide() {
        if (iconStyle) iconStyle.remove();
        if (loadingIcon) loadingIcon.remove();
    }
}