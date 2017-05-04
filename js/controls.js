/**
 * Created by ghassaei on 10/7/16.
 */


function initControls(globals){

    $("#logo").mouseenter(function(){
        $("#activeLogo").show();
        $("#inactiveLogo").hide();
    });
    $("#logo").mouseleave(function(){
        $("#inactiveLogo").show();
        $("#activeLogo").hide();
    });

    setLink("#about", function(){
        $('#aboutModal').modal('show');
    });
    setLink("#tips", function(){
        $('#tipsModal').modal('show');
    });

    setLink("#exportSTL", function(){
        $('#exportSTLModal').modal('show');
    });

    setLink("#doSTLsave", function(){
        saveSTL();
    });


    setLink("#navPattern", function(){
        if (globals.noCreasePatternAvailable()){
            globals.warn("No crease pattern available for FOLD format.");
            return;
        }
        globals.navMode = "pattern";
        $("#navPattern").parent().addClass("open");
        $("#navSimulation").parent().removeClass("open");
        $("#svgViewer").show();
    });
    $("#navSimulation").parent().addClass("open");
    $("#navPattern").parent().removeClass("open");
    setLink("#navSimulation", function(){
        globals.navMode = "simulation";
        $("#navSimulation").parent().addClass("open");
        $("#navPattern").parent().removeClass("open");
        $("#svgViewer").hide();
    });

    setCheckbox("#dynamic", globals.simType == "dynamic", function(val){
        globals.simType = val;
    });
    setCheckbox("#static", globals.simType == "static", function(val){
        globals.simType = val;
    });
    setCheckbox("#schematic", globals.schematicVisible, function(val){
        globals.schematicVisible = val;
    });

    setRadio("simType", globals.simType, function(val){
        globals.simType = val;
    });

    setSliderInput("#axialStiffness", globals.axialStiffness, 1000, 4000, 1, function(val){
        globals.axialStiffness = val;
        globals.materialHasChanged = true;
    });

    setSliderInput("#creaseStiffness", globals.creaseStiffness, 0, 100, 1, function(val){
        globals.creaseStiffness = val;
        globals.creaseMaterialHasChanged = true;
    });

    setSliderInput("#panelStiffness", globals.panelStiffness, 0, 100, 1, function(val){
        globals.panelStiffness = val;
        globals.creaseMaterialHasChanged = true;
    });

    setSliderInput("#percentDamping", globals.percentDamping, 0.1, 1, 0.01, function(val){
        globals.percentDamping = val;
        globals.materialHasChanged = true;
    });

    setSliderInput("#creasePercent", globals.creasePercent, -1, 1, 0.01, function(val){
        globals.creasePercent = val;
        globals.shouldChangeCreasePercent = true;
    });

    function setDeltaT(val){
        $("#deltaT").html(val.toFixed(4));
    }

    setLink("#resetDynamicSim", function(){
        globals.shouldResetDynamicSim = true;
    });

    setLink(".loadFile", function(e){
        $("#fileSelector").click();
        $(e.target).blur();
    });

    setLink(".demo", function(e){
        var url = $(e.target).data("url");
        if (url) {
            var extension = url.split(".");
            var name = extension[extension.length-2].split("/");
            name = name[name.length-1];
            extension = extension[extension.length-1];
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
    });

    function warnUnableToLoad(){
        globals.warn("Unable to load file.");
    }

    $("#fileSelector").change(function(e) {
        var files = e.target.files; // FileList object
        if (files.length < 1) {
            return;
        }

        var file = files[0];
        var name = file.name;
        var extension = name.split(".");
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
                    parseFoldJSON(JSON.parse(reader.result));
                }
            }(file);
            reader.readAsText(file);
        } else {
            globals.warn('Unknown file extension: .' + extension);
            return null;
        }

    });

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
        var faces = globals.pattern.triangulatePolys([json.faces_vertices, faceEdges], json.edges_vertices, json.vertices_coords, true);
        var allCreaseParams = [];
        for (var i=0;i<json.edges_vertices.length;i++){
            var v1 = json.edges_vertices[i][0];
            var v2 = json.edges_vertices[i][1];
            var creaseParams = [];
            for (var j=0;j<faces.length;j++){
                var face = faces[j];
                var faceVerts = [face.a, face.b, face.c];
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

                            switch (json.edges_assignment[i]){
                                case "B":
                                    //outline
                                    shouldSkip = true;
                                    break;
                                case "M":
                                    creaseParams.push(Math.PI);
                                    break;
                                case "V":
                                    creaseParams.push(-Math.PI);
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

        _.each(json.faceNodeIndices, function(face, i){
            json.faceNodeIndices[i] = new THREE.Face3(face[0], face[1], face[2]);
        });

        var faces = json.faceNodeIndices;
        var allCreaseParams = [];

        for (var i=0;i<json.edges.length;i++){
            var v1 = json.edges[i].vertices[0];
            var v2 = json.edges[i].vertices[1];
            var creaseParams = [];
            for (var j=0;j<faces.length;j++){
                var face = faces[j];
                var faceVerts = [face.a, face.b, face.c];
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
                                    creaseParams.push(Math.PI);
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

    setCheckbox("#ambientOcclusion", globals.ambientOcclusion, function(val){
        globals.ambientOcclusion = val;
    });

    if (globals.colorMode == "color") $("#coloredMaterialOptions").show();
    else $("#coloredMaterialOptions").hide();
    setRadio("colorMode", globals.colorMode, function(val){
        globals.colorMode = val;
        if (val == "color") $("#coloredMaterialOptions").show();
        else $("#coloredMaterialOptions").hide();
        globals.model.setMeshMaterial();
    });

    setHexInput("#color1", globals.color1, function(val){
        globals.color1 = val;
        globals.model.setMeshMaterial();
    });
    setHexInput("#color2", globals.color2, function(val){
        globals.color2 = val;
        globals.model.setMeshMaterial();
    });

    setCheckbox("#edgesVisible", globals.edgesVisible, function(val){
        globals.edgesVisible = val;
        if (globals.edgesVisible) $("#edgeVisOptions").show();
        else $("#edgeVisOptions").hide();
        globals.model.updateEdgeVisibility();
    });
    setCheckbox("#mtnsVisible", globals.mtnsVisible, function(val){
        globals.mtnsVisible = val;
        globals.model.updateEdgeVisibility();
    });
    setCheckbox("#valleysVisible", globals.valleysVisible, function(val){
        globals.valleysVisible = val;
        globals.model.updateEdgeVisibility();
    });
    setCheckbox("#panelsVisible", globals.panelsVisible, function(val){
        globals.panelsVisible = val;
        globals.model.updateEdgeVisibility();
    });
    setCheckbox("#passiveEdgesVisible", globals.passiveEdgesVisible, function(val){
        globals.passiveEdgesVisible = val;
        globals.model.updateEdgeVisibility();
    });

    setCheckbox("#meshVisible", globals.meshVisible, function(val){
        globals.meshVisible = val;
        globals.model.updateMeshVisibility();
        if (globals.meshVisible) $("#meshMaterialOptions").show();
        else $("#meshMaterialOptions").hide();
    });

    setLink("#aboutError", function(){
        $("#aboutErrorModal").modal("show");
    });
    setLink("#aboutStiffness", function(){
        $("#aboutStiffnessModal").modal("show");
    });
    setLink("#aboutDynamicSim", function(){
        $("#aboutDynamicSimModal").modal("show");
    });
    setLink("#aboutStaticSim", function(){
        $("#aboutStaticSimModal").modal("show");
    });
    setLink("#aboutAxialStrain", function(){
        $("#aboutAxialStrainModal").modal("show");
    });

    function setButtonGroup(id, callback){
        $(id+" a").click(function(e){
            e.preventDefault();
            var $target = $(e.target);
            var val = $target.data("id");
            if (val) {
                $(id+" span.dropdownLabel").html($target.html());
                callback(val);
            }
        });
    }

    function setLink(id, callback){
        $(id).click(function(e){
            e.preventDefault();
            callback(e);
        });
    }

    function setRadio(name, val, callback){
        $("input[name=" + name + "]").on('change', function() {
            var state = $("input[name="+name+"]:checked").val();
            callback(state);
        });
        $(".radio>input[value="+val+"]").prop("checked", true);
    }

    function setInput(id, val, callback, min, max){
        var $input = $(id);
        $input.change(function(){
            var val = $input.val();
            if ($input.hasClass("int")){
                if (isNaN(parseInt(val))) return;
                val = parseInt(val);
            } else {
                if (isNaN(parseFloat(val))) return;
                val = parseFloat(val);
            }
            if (min !== undefined && val < min) val = min;
            if (max !== undefined && val > max) val = max;
            $input.val(val);
            callback(val);
        });
        $input.val(val);
    }

    function setHexInput(id, val, callback){
        var $input = $(id);
        $input.css({"border-color": "#" + val});
        $input.change(function(){
            var val = $input.val();
            var validHex  = /(^[0-9A-F]{6}$)|(^[0-9A-F]{3}$)/i.test(val);
            if (!validHex) return;
            $input.val(val);
            $input.css({"border-color": "#" + val});
            callback(val);
        });
        $input.val(val);
    }

    function setCheckbox(id, state, callback){
        var $input  = $(id);
        $input.on('change', function () {
            if ($input.is(":checked")) callback(true);
            else callback(false);
        });
        $input.prop('checked', state);
    }

    function setSlider(id, val, min, max, incr, callback, callbackOnStop){
        var slider = $(id).slider({
            orientation: 'horizontal',
            range: false,
            value: val,
            min: min,
            max: max,
            step: incr
        });
        slider.on("slide", function(e, ui){
            var val = ui.value;
            callback(val);
        });
        slider.on("slidestop", function(){
            var val = slider.slider('value');
            if (callbackOnStop) callbackOnStop(val);
        })
    }

    function setLogSliderInput(id, val, min, max, incr, callback){

        var scale = (Math.log(max)-Math.log(min)) / (max-min);

        var slider = $(id+">div").slider({
            orientation: 'horizontal',
            range: false,
            value: (Math.log(val)-Math.log(min)) / scale + min,
            min: min,
            max: max,
            step: incr
        });

        var $input = $(id+">input");
        $input.change(function(){
            var val = $input.val();
            if ($input.hasClass("int")){
                if (isNaN(parseInt(val))) return;
                val = parseInt(val);
            } else {
                if (isNaN(parseFloat(val))) return;
                val = parseFloat(val);
            }

            var min = slider.slider("option", "min");
            if (val < min) val = min;
            if (val > max) val = max;
            $input.val(val);
            slider.slider('value', (Math.log(val)-Math.log(min)) / scale + min);
            callback(val, id);
        });
        $input.val(val);
        slider.on("slide", function(e, ui){
            var val = ui.value;
            val = Math.exp(Math.log(min) + scale*(val-min));
            $input.val(val.toFixed(4));
            callback(val, id);
        });
    }

    function setSliderInput(id, val, min, max, incr, callback){

        var slider = $(id+">div").slider({
            orientation: 'horizontal',
            range: false,
            value: val,
            min: min,
            max: max,
            step: incr
        });

        var $input = $(id+">input");
        $input.change(function(){
            var val = $input.val();
            if ($input.hasClass("int")){
                if (isNaN(parseInt(val))) return;
                val = parseInt(val);
            } else {
                if (isNaN(parseFloat(val))) return;
                val = parseFloat(val);
            }

            var min = slider.slider("option", "min");
            if (val < min) val = min;
            if (val > max) val = max;
            $input.val(val);
            slider.slider('value', val);
            callback(val);
        });
        $input.val(val);
        slider.on("slide", function(e, ui){
            var val = ui.value;
            $input.val(val);
            callback(val);
        });
    }

    function update(){
        function setInput(id, val){
            $(id).val(val);
        }
    }

    return {
        update:update,
        setDeltaT: setDeltaT
    }
}

