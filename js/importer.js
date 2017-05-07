/**
 * Created by amandaghassaei on 5/6/17.
 */


function initImporter(globals){

    function importDemoFile(url){
        var extension = url.split(".");
        var name = extension[extension.length-2].split("/");
        name = name[name.length-1];
        extension = extension[extension.length-1];
        // globals.setCreasePercent(0);
        if (extension == "txt"){
            $.getJSON( "assets/"+url, function( json ) {
                globals.filename = name;
                globals.extension = extension;
                parseTXTjson(json);
            });

        } else {
            globals.filename = name;
            globals.extension = extension;
            globals.pattern.loadSVG("assets/" + url);
        }
    }

    $("#fileSelector").change(function(e) {
        var files = e.target.files; // FileList object
        if (files.length < 1) {
            return;
        }

        var file = files[0];
        var extension = file.name.split(".");
        var name = extension[0];
        extension = extension[extension.length - 1];
        var reader = new FileReader();

        if (extension == "txt") {
            reader.onload = function () {
                return function (e) {
                    if (!reader.result) {
                        warnUnableToLoad();
                        return;
                    }
                    globals.filename = name;
                    globals.extension = extension;
                    // globals.setCreasePercent(0);
                    parseTXTjson(JSON.parse(reader.result));
                }
            }(file);
            reader.readAsText(file);
        } else if (extension == "svg") {
            reader.onload = function () {
                return function (e) {
                    if (!reader.result) {
                        warnUnableToLoad();
                        return;
                    }
                    globals.filename = name;
                    globals.extension = extension;
                    // globals.setCreasePercent(0);
                    globals.pattern.loadSVG(reader.result);
                }
            }(file);
            reader.readAsDataURL(file);
        } else if (extension == "fold"){
            reader.onload = function () {
                return function (e) {
                    if (!reader.result) {
                        warnUnableToLoad();
                        return;
                    }
                    globals.filename = name;
                    globals.extension = extension;
                    if (reader.result && reader.result.edges_foldAngles){
                        parseFoldJSON(JSON.parse(reader.result));
                        return;
                    }
                    $("#importFoldModal").modal("show");
                    $('#importFoldModal').on('hidden.bs.modal', function () {
                        if (globals.foldUseAngles) globals.setCreasePercent(1);
                        parseFoldJSON(JSON.parse(reader.result));
                    });

                }
            }(file);
            reader.readAsText(file);
        } else {
            globals.warn('Unknown file extension: .' + extension);
            return null;
        }

    });

    function warnUnableToLoad(){
        globals.warn("Unable to load file.");
    }

    function parseFoldJSON(json){
        _.each(json.vertices_coords, function(vertex, i){
            json.vertices_coords[i] = new THREE.Vector3(vertex[0], vertex[1], vertex[2]);
        });
        var faceEdges = [];
        _.each(json.faces_vertices, function(face){
            var thisFaceEdge = [];
            for (var i=0;i<face.length;i++){
                thisFaceEdge.push(null);
            }
            for (var i=0;i<json.edges_vertices.length;i++){
                var index1 = face.indexOf(json.edges_vertices[i][0]);
                if (index1 >= 0){
                    var index2 = face.indexOf(json.edges_vertices[i][1]);
                    if (index2 >= 0){
                        for (var j=0;j<face.length;j++){
                            var nextJ = j+1;
                            if (nextJ == face.length) nextJ = 0;
                            if ((index1==j && index2 ==nextJ) || (index1==nextJ && index2 ==j)) thisFaceEdge[j] = i;
                        }
                    }
                }
            }
            faceEdges.push(thisFaceEdge);
            face.push(face[0]);
        });
        //todo merge this with other code
        var faces = globals.pattern.triangulatePolys([json.faces_vertices, faceEdges], json.edges_vertices, json.vertices_coords, true);
        var allCreaseParams = [];
        for (var i=0;i<json.edges_vertices.length;i++){
            var v1 = json.edges_vertices[i][0];
            var v2 = json.edges_vertices[i][1];
            var creaseParams = [];
            for (var j=0;j<faces.length;j++){
                var face = faces[j];
                var faceVerts = [face[0], face[1], face[2]];
                var v1Index = faceVerts.indexOf(v1);
                if (v1Index>=0){
                    var v2Index = faceVerts.indexOf(v2);
                    if (v2Index>=0){
                        creaseParams.push(j);
                        if (v2Index>v1Index) {//remove larger index first
                            faceVerts.splice(v2Index, 1);
                            faceVerts.splice(v1Index, 1);
                        } else {
                            faceVerts.splice(v1Index, 1);
                            faceVerts.splice(v2Index, 1);
                        }
                        creaseParams.push(faceVerts[0]);
                        if (creaseParams.length == 4) {

                            if (v2Index-v1Index == 1 || v2Index-v1Index == -2) {
                                creaseParams = [creaseParams[2], creaseParams[3], creaseParams[0], creaseParams[1]];
                            }

                            creaseParams.push(i);
                            var shouldSkip = false;

                            var foldSign = 1;
                            switch (json.edges_assignment[i]){
                                case "B":
                                    //outline
                                    shouldSkip = true;
                                    break;
                                case "V":
                                    foldSign = -1;
                                case "M":
                                    if (json.edges_foldAngles && json.edges_foldAngles[i]){
                                        creaseParams.push(foldSign*json.edges_foldAngles[i]);
                                        break;
                                    }
                                    if (globals.foldUseAngles){
                                        var face1 = faces[creaseParams[0]];
                                        var vec1 = json.vertices_coords[face1[1]].clone().sub(json.vertices_coords[face1[0]]);
                                        var vec2 = json.vertices_coords[face1[2]].clone().sub(json.vertices_coords[face1[0]]);
                                        var normal1 = (vec2.cross(vec1)).normalize();
                                        var face2 = faces[creaseParams[2]];
                                        vec1 = json.vertices_coords[face2[1]].clone().sub(json.vertices_coords[face2[0]]);
                                        vec2 = json.vertices_coords[face2[2]].clone().sub(json.vertices_coords[face2[0]]);
                                        var normal2 = (vec2.cross(vec1)).normalize();
                                        var x = normal1.dot(normal2);
                                        var y = normal1.cross((json.vertices_coords[v2].clone().sub(json.vertices_coords[v1])).normalize()).dot(normal2);
                                        var angle = Math.atan2(y, x);
                                        if (angle>0) console.log(json.edges_assignment[i]);
                                        else console.log(json.edges_assignment[i]);
                                        if (Math.abs(Math.PI-Math.abs(angle)) < 0.2){
                                            angle = Math.PI*foldSign;
                                        }
                                        creaseParams.push(angle);
                                        break;
                                    }
                                    creaseParams.push(foldSign*Math.PI);
                                    break;
                                case "F":
                                    creaseParams.push(0);
                                    break;
                                default:
                                    creaseParams.push(0);
                                    break;
                            }
                            if (!shouldSkip) allCreaseParams.push(creaseParams);
                            break;
                        }
                    }
                }
            }
        }
        globals.model.buildModel(faces, json.vertices_coords, json.edges_vertices, allCreaseParams);
    }

    function parseTXTjson(json){

        var faces = json.faceNodeIndices;
        var allCreaseParams = [];

        for (var i=0;i<json.edges.length;i++){
            var v1 = json.edges[i].vertices[0];
            var v2 = json.edges[i].vertices[1];
            var creaseParams = [];
            for (var j=0;j<faces.length;j++){
                var face = faces[j];
                var faceVerts = [face[0], face[1], face[2]];
                var v1Index = faceVerts.indexOf(v1);
                if (v1Index>=0){
                    var v2Index = faceVerts.indexOf(v2);
                    if (v2Index>=0){
                        creaseParams.push(j);
                        if (v2Index>v1Index) {//remove larger index first
                            faceVerts.splice(v2Index, 1);
                            faceVerts.splice(v1Index, 1);
                        } else {
                            faceVerts.splice(v1Index, 1);
                            faceVerts.splice(v2Index, 1);
                        }
                        creaseParams.push(faceVerts[0]);
                        if (creaseParams.length == 4) {

                            if (v2Index-v1Index == 1 || v2Index-v1Index == -2) {
                                creaseParams = [creaseParams[2], creaseParams[3], creaseParams[0], creaseParams[1]];
                            }

                            creaseParams.push(i);
                            var shouldSkip = false;

                            switch (json.edges[i].type){
                                case 0:
                                    //rule lines
                                    shouldSkip = true;
                                    break;
                                case 1:
                                    //quad panels
                                    creaseParams.push(0);
                                    break;
                                case 3:
                                    //outline
                                    shouldSkip = true;
                                    break;
                                case 2:
                                    //crease
                                    creaseParams.push(Math.PI);//todo only mtn
                                    break;
                            }
                            if (!shouldSkip) allCreaseParams.push(creaseParams);
                            break;
                        }
                    }
                }
            }
        }

        _.each(json.nodes, function(node, i){
            json.nodes[i] = new THREE.Vector3(node.x, node.y, node.z);
        });

        _.each(json.edges, function(edge, i){
            json.edges[i] = [edge.vertices[0], edge.vertices[1]];
        });
        globals.model.buildModel(faces, json.nodes, json.edges, allCreaseParams);
    }

    return {
        importDemoFile: importDemoFile
    }
}