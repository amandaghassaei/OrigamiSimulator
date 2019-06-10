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
// import Controls from "./controls";
// import Importer from "./importer";
// import Vive from "./VRInterface";
// import VideoAnimator from "./videoAnimator";

const OrigamiSimulator = function (options) {
  // todo: handle options argument

  const app = JSON.parse(JSON.stringify(defaults));

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

  const warn = function (msg) {
    console.warn(msg);
    // if (($("#warningMessage").html()) != "") $("#warningMessage").append("<br/><hr>" + msg);
    // else $("#warningMessage").html(msg);
    // if (!$('#warningModal').hasClass('show')) $("#warningModal").modal("show");
  };

  const setCreasePercent = function (percent) {
    // app.creasePercent = percent;
    // percent *= 100;
    // $("#creasePercent>div").slider({value:percent});
    // $("#creasePercent>input").val(percent.toFixed(0));
    // $("#creasePercentNav>div").slider({value:percent});
    // $("#creasePercentBottom>div").slider({value:percent});
  };

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

  app.setCreasePercent = setCreasePercent;
  app.warn = warn;

  return app;
};

export default OrigamiSimulator;
