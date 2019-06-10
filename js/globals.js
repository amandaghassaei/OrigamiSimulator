/**
 * Created by ghassaei on 10/7/16.
 */

const globalDefaults = {
  navMode: "simulation",
  scale: 1,

  // view
  colorMode: "color",
  calcFaceStrain: false,
  color1: "ec008b",
  color2: "ffffff",
  edgesVisible: true,
  mtnsVisible: true,
  valleysVisible: true,
  panelsVisible: false,
  passiveEdgesVisible: false,
  boundaryEdgesVisible: true,
  meshVisible: true,
  ambientOcclusion: false,

  // flags
  simulationRunning: true,
  fixedHasChanged: false,
  forceHasChanged: false,
  materialHasChanged: false,
  creaseMaterialHasChanged: false,
  shouldResetDynamicSim: false, // not used
  shouldChangeCreasePercent: false,
  nodePositionHasChanged: false,
  shouldZeroDynamicVelocity: false,
  shouldCenterGeo: false,
  needsSync: false,
  simNeedsSync: false,

  menusVisible: true,

  url: null,

  // 3d vis
  simType: "dynamic",

  // compliant sim settings
  creasePercent: 0.6,
  axialStiffness: 20,
  creaseStiffness: 0.7,
  panelStiffness: 0.7,
  faceStiffness: 0.2,

  // dynamic sim settings
  percentDamping: 0.45, // damping ratio
  density: 1,
  integrationType: "euler",

  strainClip: 5.0, // for strain visualization, % strain that is drawn red

  // import pattern settings
  vertTol: 0.001, // vertex merge tolerance
  foldUseAngles: true, // import current angles from fold format as target angles

  // save stl settings
  filename: null,
  extension: null,
  doublesidedSTL: false,
  doublesidedOBJ: false,
  exportScale: 1,
  thickenModel: true,
  thickenOffset: 5,
  polyFacesOBJ: true,

  // save fold settings
  foldUnits: "unit",
  triangulateFOLDexport: false,
  exportFoldAngle: true,

  pausedForPatternView: false,

  userInteractionEnabled: false,
  vrEnabled: false,

  numSteps: 100,

  backgroundColor: "EEE",

  capturer: null,
  capturerQuality: 63,
  capturerFPS: 60,
  gifFPS: 20,
  currentFPS: null,
  capturerScale: 1,
  capturerFrames: 0,
  shouldScaleCanvas: false,
  isGif: false,
  shouldAnimateFoldPercent: false
};

export default globalDefaults;
