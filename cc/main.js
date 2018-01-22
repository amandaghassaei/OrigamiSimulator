/**
 * Created by amandaghassaei on 1/20/18.
 */


$(function() {

    var threeView = ThreeView($("#threeContainer"));
    var model3D = Model3D();
    var dynamicSolver = DynamicSolver($("#gpuMathCanvas"));
    var patternImporter = PatternImporter();

    threeView.addModel(model3D);

    var $foldViewer = $("#foldViewer");
    var svg = SVG('foldViewer').size($foldViewer.width(), $foldViewer.height()).panZoom();
    svg.element("style").words(
        ".M {stroke:#f00}\n" +
        ".V {stroke:#00f}\n" +
        ".B {stroke:#000}\n" +
        ".C {stroke:#0f0}\n" +
        ".F {stroke:#ff0}\n" +
        ".U {stroke:#f0f}\n"
    );

    svg.on('mouseup', dragEnd);
    svg.on('mouseleave', dragEnd);

    function dragEnd(){
       svg.off('mousemove');
    }

    svg.on('dragstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
    svg.on('selectstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });

    // dynamicSolver.setDamping(0.1);
    model3D.setColorMode("axialStrain");

    patternImporter.loadSVG('assets/cctests/huffmanTower-facets.svg', {vertexTol: 1.8}, function(){

        var fold = patternImporter.getFold();
        // var rawFold = patternImporter.getPreProcessedFoldData();
        // rawFold = patternImporter.scaleFOLD(rawFold).fold;
        fold = patternImporter.edgesVerticesToVerticesEdges(fold);

        drawSVGViewer(fold);
        svg.zoom(1000);


        model3D.setFold(fold);
        dynamicSolver.setFold(fold);

        model3D.setFacetVisiblity(true);

        window.requestAnimationFrame(loop);

    });

    $(window).resize(function(){
        threeView.onWindowResize();

        svg.size($foldViewer.width(), $foldViewer.height());
    });

    function loop(){

        dynamicSolver.stepForward({numSteps: 100});
        dynamicSolver.updateModel3DGeometry(model3D, {colorMode: "axialStrain", strainClip: 5});
        threeView.render();

        window.requestAnimationFrame(loop);
    }



    function drawSVGViewer(fold){
        var coords, edge_vertices, j, len, len1, ref, ref1, vertex; ref = fold.vertices_coords;

        var lineElements = [];

        ref1 = fold.edges_vertices;
        for (j = 0, len1 = ref1.length; j < len1; j++) {
          edge_vertices = ref1[j];
          var line = svg.line(...((function() {
            var k, len2, results;
            results = [];
            for (k = 0, len2 = edge_vertices.length; k < len2; k++) {
              vertex = edge_vertices[k];
              results.push(fold.vertices_coords[vertex][0], fold.vertices_coords[vertex][2]);
            }
            return results;
          })())).stroke({width:0.005}).addClass(fold.edges_assignment[j]);
            if (fold.edges_assignment[j] == "M" || fold.edges_assignment[j] == "V"){
                line.opacity(Math.abs(fold.edges_foldAngles[j])/Math.PI)
            }
            lineElements.push(line);
        }
        for (let i = 0, len = ref.length; i < len; i++) {
            coords = ref[i];
            let element = svg.circle(0.01).center(coords[0], coords[2]);
            element.mousedown(function(e){
                e.preventDefault();
                e.stopPropagation();
                svg.mousemove(function(e){
                    var point = svg.point(e.clientX, e.clientY);
                    element.center(point.x, point.y);
                    dragVertex(i, point);
                });
            });

          ; }
        svg.viewbox(svg.bbox());

        function dragVertex(index, point){
            fold.vertices_coords[index] = [point.x, 0, point.y];
            var edges = fold.vertices_edges[index];
            for (edgeIndex of edges){
                //redraw line
                var edgeVertices = fold.edges_vertices[edgeIndex];
                lineElements[edgeIndex].plot(fold.vertices_coords[edgeVertices[0]][0],
                    fold.vertices_coords[edgeVertices[0]][2],
                    fold.vertices_coords[edgeVertices[1]][0],
                    fold.vertices_coords[edgeVertices[1]][2]);
            }
            //update sim
            model3D.setFold(fold);
            dynamicSolver.setFold(fold);
        }

    }


});