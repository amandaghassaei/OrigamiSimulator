/**
 * Created by amandaghassaei on 1/20/18.
 */


$(function() {

    var threeView = ThreeView($("#threeContainer"));
    var model3D = Model3D();
    var dynamicSolver = DynamicSolver($("#gpuMathCanvas"));
    var patternImporter = PatternImporter();

    threeView.addModel(model3D);

    patternImporter.loadSVG('assets/Tessellations/huffmanWaterbomb.svg', {vertexTol: 3}, function(){

        var fold = patternImporter.getFold();
        model3D.setFold(fold);
        dynamicSolver.setFold(fold);

        window.requestAnimationFrame(loop);

    });

    function loop(){

        dynamicSolver.stepForward({numSteps: 100});
        dynamicSolver.updateModel3DGeometry(model3D);
        threeView.render();

        window.requestAnimationFrame(loop);
    }

});