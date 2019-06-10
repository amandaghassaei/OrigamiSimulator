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

/**
 * return a copy of the user's options object that contains only keys
 * matching valid options parameters, taken from "globals.js"
 */
const validateUserOptions = function (options) {
  if (options == null) { return {}; }
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
    validateUserOptions(options)
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

  // object methods
  const loadSVG = function (svgAsDomNode) {
    app.threeView.resetModel();
    app.pattern.loadSVG(svgAsDomNode);
  };
  const loadSVGString = function (svgAsString) {
    app.threeView.resetModel();
    const svg = new DOMParser().parseFromString(svgAsString, "text/xml").childNodes[0];
    app.pattern.loadSVG(svg);
  };
  const warn = msg => console.warn(msg);
  const noCreasePatternAvailable = () => app.extension === "fold";

  Object.defineProperty(app, "loadSVG", { value: loadSVG });
  Object.defineProperty(app, "loadSVGString", { value: loadSVGString });
  Object.defineProperty(app, "warn", { value: warn });
  Object.defineProperty(app, "noCreasePatternAvailable", { value: noCreasePatternAvailable });

  // boot app
  init();

  return app;
};

export default OrigamiSimulator;
