/**
 * Created by amandaghassaei on 1/20/18.
 */


$(function() {

    var threeView = ThreeView($("#threeContainer"));
    var model3D = Model3D();
    var dynamicSolver = DynamicSolver($("#gpuMathCanvas"));
    var patternImporter = PatternImporter();

    threeView.addObjects(model3D.getObject3Ds());

    patternImporter.loadSVG('assets/Tessellations/huffmanWaterbomb.svg', {vertexTol: 3}, function(){

        var scaledFold = model3D.setFoldData(patternImporter.getFoldData());
        dynamicSolver.setFoldData(scaledFold);

        window.requestAnimationFrame(loop);

    });

    function loop(){
        
        dynamicSolver.stepForward({numSteps: 100});
        dynamicSolver.updateModel3DGeometry(model3D);
        threeView.render();

        window.requestAnimationFrame(loop);
    }

});