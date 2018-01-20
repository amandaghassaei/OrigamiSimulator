/**
 * Created by amandaghassaei on 1/20/18.
 */


$(function() {

    var threeView = ThreeView($("#threeContainer"));
    var model3D = Model3D();
    var dynamicSolver = DynamicSolver($("#gpuMathCanvas"));
    var patternImporter = PatternImporter();

    threeView.addModel(model3D);

    dynamicSolver.setDamping(0.1);
    model3D.setColorMode("axialStrain");

    patternImporter.loadSVG('assets/cctests/huffmanTower-noends,nosides.svg', {vertexTol: 1.8}, function(){

        var fold = patternImporter.getFold();
        model3D.setFold(fold);
        dynamicSolver.setFold(fold);

        window.requestAnimationFrame(loop);

    });

    $(window).resize(threeView.onWindowResize);

    function loop(){

        dynamicSolver.stepForward({numSteps: 100});
        dynamicSolver.updateModel3DGeometry(model3D, {colorMode: "axialStrain", strainClip: 5});
        threeView.render();

        window.requestAnimationFrame(loop);
    }

});