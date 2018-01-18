/**
 * Created by amandaghassaei on 1/17/18.
 */


function PatternViewer2D($container){

    var svg;

    function makeSVG(fold){

        var ns = 'http://www.w3.org/2000/svg';
        var svg = document.createElementNS(ns, 'svg');

        //if fold is 3D - no svg available
        for (var i=0;i<fold.vertices_coords.length;i++){
            if (fold.vertices_coords[i].length > 2) return svg;//return empty svg
        }

        //find max and min vertices
        var max = new THREE.Vector2(-Infinity,-Infinity);
        var min = new THREE.Vector2(Infinity,Infinity);
        for (var i=0;i<fold.vertices_coords.length;i++){
            var vertex = new THREE.Vector2(fold.vertices_coords[i][0], fold.vertices_coords[i][1]);
            max.max(vertex);
            min.min(vertex);
        }
        if (min.x === Infinity){
            globals.warn("no geometry found in file");
            return;
        }
        max.sub(min);
        var border = new THREE.Vector2(0.1, 0.1);
        var scale = max.x;
        if (max.y < scale) scale = max.y;
        if (scale == 0) return;

        var strokeWidth = scale/300;
        border.multiplyScalar(scale);
        min.sub(border);
        max.add(border.multiplyScalar(2));
        var viewBoxTxt = min.x + " " + min.y + " " + max.x + " " + max.y;

        svg.setAttribute('viewBox', viewBoxTxt);
        for (var i=0;i<fold.edges_vertices.length;i++){
            var line = document.createElementNS(ns, 'line');
            var edge = fold.edges_vertices[i];
            var vertex = fold.vertices_coords[edge[0]];
            line.setAttribute('stroke', colorForAssignment(fold.edges_assignment[i]));
            line.setAttribute('opacity', opacityForAngle(fold.edges_foldAngles[i], fold.edges_assignment[i]));
            line.setAttribute('x1', vertex[0]);
            line.setAttribute('y1', vertex[1]);
            vertex = fold.vertices_coords[edge[1]];
            line.setAttribute('x2', vertex[0]);
            line.setAttribute('y2', vertex[1]);
            line.setAttribute('stroke-width', strokeWidth);
            svg.appendChild(line);
        }
        return svg;
    }

    function opacityForAngle(angle, assignment){
        if (angle === null || assignment == "F") return 1;
        return Math.abs(angle)/Math.PI;
    }

    function colorForAssignment(assignment){
        if (assignment == "B") return "#000";//border
        if (assignment == "M") return "#f00";//mountain
        if (assignment == "V") return "#00f";//valley
        if (assignment == "C") return "#0f0";//cut
        if (assignment == "F") return "#ff0";//facet
        if (assignment == "U") return "#f0f";//hinge
        return "#0ff"
    }

    function saveSVG() {
        if (globals.extension == "fold") {
            //todo solve for crease pattern
            globals.warn("No crease pattern available for files imported from FOLD format.");
            return;
        }
        var serializer = new XMLSerializer();
        if (!svg) svg = makeSVG(globals.PatternImporter.getRawFoldData());
        var source = serializer.serializeToString(svg);
        var svgBlob = new Blob([source], {type: "image/svg+xml;charset=utf-8"});
        var svgUrl = URL.createObjectURL(svgBlob);
        var downloadLink = document.createElement("a");
        downloadLink.href = svgUrl;
        downloadLink.download = globals.filename + ".svg";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }

    function showSVG(){
        svg = makeSVG(globals.PatternImporter.getRawFoldData());
        $container.html(svg);
    }

    return {
        saveSVG: saveSVG,
        showSVG: showSVG
    }

}