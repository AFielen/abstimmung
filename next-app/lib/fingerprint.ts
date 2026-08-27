// Browser fingerprint generation — client-side only
// Direct port of generateDeviceFingerprint from ui.js

export function generateDeviceFingerprint(): Promise<string> {
  return Promise.race([
    generateDeviceFingerprintInternal(),
    new Promise<string>((resolve) =>
      setTimeout(() => resolve("timeout-" + Date.now().toString(36)), 5000)
    ),
  ]);
}

function generateDeviceFingerprintInternal(): Promise<string> {
  return new Promise<string>(function (resolve) {
    const signals: string[] = [];

    // 1. Screen properties
    signals.push(
      "scr:" +
        screen.width +
        "x" +
        screen.height +
        "x" +
        screen.availHeight +
        "x" +
        screen.colorDepth
    );
    signals.push("dpr:" + (window.devicePixelRatio || 1));

    // 2. Hardware signals
    signals.push("cores:" + (navigator.hardwareConcurrency || "?"));
    signals.push(
      "mem:" + ((navigator as unknown as { deviceMemory?: number }).deviceMemory || "?")
    );

    // 3. Browser/platform signals
    signals.push("lang:" + (navigator.language || ""));
    signals.push(
      "langs:" + (navigator.languages ? navigator.languages.join(",") : "")
    );
    signals.push(
      "tz:" +
        (Intl.DateTimeFormat
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : "")
    );
    signals.push("touch:" + (navigator.maxTouchPoints || 0));
    signals.push(
      "plat:" + ((navigator as unknown as { platform?: string }).platform || "")
    );

    // 4. Canvas fingerprint
    try {
      const cv = document.createElement("canvas");
      cv.width = 280;
      cv.height = 60;
      const cx = cv.getContext("2d")!;
      cx.fillStyle = "#f0e68c";
      cx.fillRect(0, 0, 280, 60);
      cx.fillStyle = "#c82124";
      cx.font = "18px Arial";
      cx.fillText("DRK Fingerprint Test 2026!", 2, 20);
      cx.fillStyle = "rgba(0,120,255,0.6)";
      cx.font = "bold 14px Times New Roman";
      cx.fillText("Canvas FP \u{1F600}", 4, 45);
      cx.strokeStyle = "#2a4d8f";
      cx.beginPath();
      cx.arc(200, 30, 20, 0, Math.PI * 2);
      cx.stroke();
      signals.push("canvas:" + cv.toDataURL());
    } catch {
      signals.push("canvas:err");
    }

    // 5. WebGL renderer
    try {
      const gl = document.createElement("canvas").getContext("webgl");
      if (gl) {
        const dbg = gl.getExtension("WEBGL_debug_renderer_info");
        if (dbg) {
          signals.push("glv:" + gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL));
          signals.push("glr:" + gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL));
        } else {
          signals.push("glv:" + gl.getParameter(gl.VENDOR));
          signals.push("glr:" + gl.getParameter(gl.RENDERER));
        }
      } else {
        signals.push("gl:none");
      }
    } catch {
      signals.push("gl:err");
    }

    // 6. Font detection
    try {
      const testFonts = [
        "Arial",
        "Verdana",
        "Times New Roman",
        "Courier New",
        "Georgia",
        "Palatino",
        "Garamond",
        "Comic Sans MS",
        "Impact",
        "Lucida Console",
        "Tahoma",
        "Trebuchet MS",
        "Arial Black",
        "Helvetica",
        "Futura",
        "Calibri",
        "Cambria",
        "Consolas",
        "Segoe UI",
        "Roboto",
      ];
      // One span per font, all appended before any measurement: batching the
      // DOM writes ahead of the reads costs a single forced layout instead of
      // one per font. Styles and text match the previous per-font loop, so the
      // measured values (and thus the fingerprint) stay identical.
      const makeSpan = (family: string) => {
        const s = document.createElement("span");
        s.style.cssText =
          "position:absolute;left:-9999px;font-size:72px;visibility:hidden";
        s.style.fontFamily = family;
        s.textContent = "mmmmmmmmmmlli";
        document.body.appendChild(s);
        return s;
      };
      const baseSpan = makeSpan("monospace");
      const fontSpans = testFonts.map(function (f) {
        return makeSpan('"' + f + '", monospace');
      });
      const baseW = baseSpan.offsetWidth;
      const baseH = baseSpan.offsetHeight;
      let fontBits = "";
      fontSpans.forEach(function (s) {
        fontBits +=
          s.offsetWidth !== baseW || s.offsetHeight !== baseH ? "1" : "0";
      });
      document.body.removeChild(baseSpan);
      fontSpans.forEach(function (s) {
        document.body.removeChild(s);
      });
      signals.push("fonts:" + fontBits);
    } catch {
      signals.push("fonts:err");
    }

    // 7. Audio fingerprint (no audible sound — gain = 0)
    const audioReady = new Promise<void>(function (res) {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioCtx) {
          signals.push("audio:err");
          res();
          return;
        }
        const actx = new AudioCtx();
        const osc = actx.createOscillator();
        osc.type = "triangle";
        osc.frequency.value = 10000;
        const comp = actx.createDynamicsCompressor();
        comp.threshold.value = -50;
        comp.knee.value = 40;
        comp.ratio.value = 12;
        comp.attack.value = 0;
        comp.release.value = 0.25;
        const gain = actx.createGain();
        gain.gain.value = 0; // silent
        const analyser = actx.createAnalyser();
        analyser.fftSize = 256;
        osc.connect(comp);
        comp.connect(analyser);
        analyser.connect(gain);
        gain.connect(actx.destination);
        osc.start(0);
        setTimeout(function () {
          const data = new Float32Array(analyser.frequencyBinCount);
          analyser.getFloatFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += Math.abs(data[i]);
          signals.push("audio:" + sum.toFixed(4));
          osc.stop();
          actx.close();
          res();
        }, 100);
      } catch {
        signals.push("audio:err");
        res();
      }
    });

    audioReady.then(function () {
      // Hash all signals with SHA-256
      const raw = signals.join("|");
      const encoder = new TextEncoder();
      const encoded = encoder.encode(raw);
      crypto.subtle
        .digest("SHA-256", encoded)
        .then(function (buf) {
          const arr = new Uint8Array(buf);
          let hex = "";
          for (let i = 0; i < arr.length; i++) {
            hex += ("0" + arr[i].toString(16)).slice(-2);
          }
          resolve(hex);
        })
        .catch(function () {
          // Fallback: simple hash if crypto.subtle unavailable (http)
          let hash = 0;
          for (let i = 0; i < raw.length; i++) {
            hash = ((hash << 5) - hash) + raw.charCodeAt(i);
            hash |= 0;
          }
          resolve("fallback-" + Math.abs(hash).toString(36));
        });
    });
  });
}
