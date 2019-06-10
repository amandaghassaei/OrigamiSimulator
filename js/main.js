/**
 * Created by ghassaei on 2/22/17.
 */

import defaults from "./globals";
import ThreeView from "./threeView";
import UI3D from "./3dUI";
import GPUMath from "./dynamic/GPUMath";
import DynamicSolver from "./dynamic/dynamicSolver";
import Model from "./model";
import Pattern from "./pattern";
// import Controls from "./controls"; // this file is all kinds of front-end hardcoded
// import Importer from "./importer";
// import Vive from "./VRInterface";
// import VideoAnimator from "./videoAnimator";

const validateOptions = function (options) {
  if (options == null) { return {}; }
  // filter out all keys in options which aren't contained on the global defaults object
  const validKeys = Object.keys(defaults);
  const validatedOptions = {};
  Object.keys(options)
    .filter(key => validKeys.includes(key))
    .forEach((key) => { validatedOptions[key] = options[key]; });
  return validatedOptions;
};

const OrigamiSimulator = function (options) {
  const app = Object.assign(
    JSON.parse(JSON.stringify(defaults)),
    validateOptions(options)
  );

  const init = function () {
    app.threeView = ThreeView(app);
    // app.controls = Controls(app);
    app.UI3D = UI3D(app);
    // app.importer = Importer(app);
    app.model = Model(app);
    app.gpuMath = GPUMath();
    app.dynamicSolver = DynamicSolver(app);
    app.pattern = Pattern(app);
    // app.vive = Vive(app);
    // app.videoAnimator = VideoAnimator(app);
  };

  const loadSVG = function (svgAsDomNode) {
    app.threeView.resetModel();
    app.pattern.loadSVG(svgAsDomNode);
  };
  const loadSVGString = function (svgAsString) {
    app.threeView.resetModel();
    const svg = new DOMParser().parseFromString(svgAsString, "text/xml").childNodes[0];
    app.pattern.loadSVG(svg);
  };

  const warn = function (msg) {
    console.warn(msg);
  };

  // const setCreasePercent = function (percent) {
  //   app.creasePercent = percent;
  // };

  function noCreasePatternAvailable() {
    return app.extension === "fold";
  }
  app.noCreasePatternAvailable = noCreasePatternAvailable;

  // boot app
  window.addEventListener("load", () => { init(); });
  if (document.readyState === "loading") {
    // wait until after the <body> has rendered
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  Object.defineProperty(app, "loadSVG", { value: loadSVG });
  Object.defineProperty(app, "loadSVGString", { value: loadSVGString });

  // app.setCreasePercent = setCreasePercent;
  app.warn = warn;

  return app;
};

export default OrigamiSimulator;
