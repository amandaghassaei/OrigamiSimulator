/**
 * Created by amandaghassaei on 5/6/17.
 */

function saveFOLD(){

    if (globals.Itterate==true){
        var filename = $("#foldSeriesFilename").val();
    }else{
        var filename = $("#foldFilename").val();
    }
    if (filename == "") filename = globals.filename;

    if (globals.Itterate==true){
        var json = {
            file_spec: 1.1,
            file_creator: "Origami Simulator: http://git.amandaghassaei.com/OrigamiSimulator/",
            file_author: $("#foldAuthor").val(),
            file_classes: ["singleModel"],
            file_frames: [],
            edges_vertices: [],
            edges_assignment: [],
            faces_vertices: []
        };
    }else{
        var json = {
            file_spec: 1.1,
            file_creator: "Origami Simulator: http://git.amandaghassaei.com/OrigamiSimulator/",
            file_author: $("#foldAuthor").val(),
            file_classes: ["singleModel"],
            frame_title: filename,
            frame_classes: ["foldedForm"],
            frame_attributes: ["3D"],
            frame_unit: globals.foldUnits,
            vertices_coords: [],
            edges_vertices: [],
            edges_assignment: [],
            faces_vertices: []
        };
    }
    var useTriangulated = globals.triangulateFOLDseriesExport;
    var fold = globals.pattern.getFoldData(!useTriangulated);
    
    var useTriangulated = globals.triangulateFOLDexport;
    if (!globals.includeCurves) {
        var fold = globals.pattern.getFoldData(!useTriangulated);
    } else {
        var fold = globals.curvedFolding.getFoldData(!useTriangulated);
    }
    json.edges_vertices = fold.edges_vertices;

    var assignment = [];
    for (var i=0;i<fold.edges_assignment.length;i++){
        if (fold.edges_assignment[i] == "C"){
            assignment.push("B");
            //edgecount+=1;
        }else{
            assignment.push(fold.edges_assignment[i]);
            //if (fold.edges_assignment[i] == "B") {
                //edgecount+=1;

            //}
        }
    }
    json.edges_assignment = assignment;

    json.faces_vertices = fold.faces_vertices;

    if (globals.exportFoldSeriesAngle){
        json.edges_foldAngle = fold.edges_foldAngle;
    }

    if (globals.Itterate==true){

        var sigFig = 100000; //Where to round percents
        var startPercent = globals.startPercent/100;
        var toPercent = globals.toPercent/100;
        var stepSize = globals.stepSize/100;

        var creasePercent = startPercent;
        creasePercent=Math.round(creasePercent*sigFig)/sigFig;
        var nextCreasePercent = creasePercent;

        globals.setCreasePercent(creasePercent);
        globals.shouldChangeCreasePercent=true;



        var previousDate = new Date();
        var previousError = globals.globalErrors;
        function getFrames(json,filename){//(creasePercent<=toPercent && creasePercent>=-1){

            var file_frame= {
                frame_title: filename,
                frame_classes: ["foldedForm"],
                frame_attributes: ["3D"],
                frame_unit: globals.foldUnits,
                frame_inherit: true,
                fold_percent_os: [],
                vertices_coords: [],
            };

            globals.threeView.saveFOLDloop(); //Runs simulation for current fold percent.
            var itteration_save_output=should_do_save_fold(previousError,previousDate);

            var do_save_now=itteration_save_output[0];
            previousError=itteration_save_output[1];
            previousDate=itteration_save_output[2];

            nextCreasePercent=itteration_save_output[3];
            nextCreasePercent=Math.round(nextCreasePercent*sigFig)/sigFig;

            if (do_save_now){
                var geo=getGeometry();
                var fold = globals.pattern.getFoldData(!useTriangulated);

                file_frame.fold_percent_os=creasePercent;

                for (var i=0;i<geo.vertices.length;i++){
                    var vertex = geo.vertices[i];
                    file_frame.vertices_coords.push([vertex.x, vertex.y, vertex.z]);
                }

                if (globals.exportFoldSeriesActualAngle){
                    var thetas=grabThetas(json);
                    file_frame.edges_crease_angle_os=thetas;
                }

                json.file_frames.push(file_frame);

            }
            //document.getElementById("foldPercentOutput").innerHTML = creasePercent;
            //Update progress on page.
            var percentage = Math.abs((creasePercent-startPercent)/(toPercent-startPercent)*100);
            var $foldPercentProgress = $("#foldPercentOutput");
            $("#foldPercentOutput").html((nextCreasePercent*100).toFixed(3) + " %");
            $(".progress-bar").css("width", percentage+"%")
            creasePercent=nextCreasePercent;


            is_under_percent=creasePercent<=toPercent;
            is_above_percent=creasePercent>=toPercent;
            posStep=stepSize>0;

            //This section allows for the browser to update while executing the
            //"while" loop, allowing animation as well as a breakpoint via the
            //controls.
            if(globals.break){
                globals.break=false;
            }else if ((is_under_percent && posStep)||(is_above_percent && !posStep)){
                setTimeout(function(){getFrames(json,filename);},5);
            }else{
                $("#FOLDseriesProgressModal").modal('hide');
                saveJSON(json,filename);
            }
        }
        getFrames(json,filename);

    }else{

        var geo=getGeometry();


        for (var i=0;i<geo.vertices.length;i++){
            var vertex = geo.vertices[i];
            json.vertices_coords.push([vertex.x, vertex.y, vertex.z]);
        }

        if (globals.exportFoldActualAngle){
            thetas=grabThetas(json);
            json.edges_crease_angle_os=thetas;
        }
        saveJSON(json,filename);
    }



}

function saveJSON(json,filename){
    var blob = new Blob([JSON.stringify(json, null, 4)], {type: 'application/octet-binary'});
    saveAs(blob, filename + ".fold");
}

function grabThetas(json){
//Copied from rigidSolver + a few changes (call a function from rigidSolver instead?)
  var creases = globals.model.getCreases();
  var geo = new THREE.Geometry().fromBufferGeometry( globals.model.getGeometry() );
  var thetas = [];
  var creaseThetas = [];

      var geometry = globals.model.getGeometry();
      var indices = geometry.index.array;
      var normals = [];
      var positions = globals.model.getPositionsArray();
      var cb = new THREE.Vector3(), ab = new THREE.Vector3();
      for (var j=0;j<indices.length;j+=3){
          var index = 3*indices[j];
          var vA = new THREE.Vector3(positions[index], positions[index+1], positions[index+2]);
          index = 3*indices[j+1];
          var vB = new THREE.Vector3(positions[index], positions[index+1], positions[index+2]);
          index = 3*indices[j+2];
          var vC = new THREE.Vector3(positions[index], positions[index+1], positions[index+2]);
          cb.subVectors( vC, vB );
          ab.subVectors( vA, vB );
          cb.cross( ab );

          cb.normalize();
          normals.push(cb.clone());
      }
      for (var j=0;j<creases.length;j++){
          var crease = creases[j];
          var normal1 = normals[crease.face1Index];
          var normal2 = normals[crease.face2Index];
          var dotNormals = normal1.dot(normal2);
          if (dotNormals < -1.0) dotNormals = -1.0;
          else if (dotNormals > 1.0) dotNormals = 1.0;

          var creaseVector = crease.getVector().normalize();
          //https://math.stackexchange.com/questions/47059/how-do-i-calculate-a-dihedral-angle-given-cartesian-coordinates
          var theta = Math.atan2((normal1.clone().cross(creaseVector)).dot(normal2), dotNormals);
          thetas[j] = theta*180/Math.PI;
      }

      //This inserts a null value for any edges connected to less than
      //two faces
      for(var i=0; i<=json.edges_assignment.length-1; i++){
          if (json.edges_assignment[i]=="B"){

              creaseThetas.push(undefined);
          }else{
              creaseThetas.push(thetas[0]);
              thetas.shift();
          }
      }

      return creaseThetas;
}

function getGeometry(){
  var geo = new THREE.Geometry().fromBufferGeometry( globals.model.getGeometry() );

  if (geo.vertices.length == 0 || geo.faces.length == 0) {
      globals.warn("No geometry to save.");
      return;
  }

  if (globals.exportScale != 1){
      for (var i=0;i<geo.vertices.length;i++){
          geo.vertices[i].multiplyScalar(globals.exportScale);
      }
  }
  return geo;
}



function should_do_save_fold(previousError,previousDate){
    //Every second-ish, checks whether the user input error difference is met.
    //If so, then update the fold percentage and tell the main loop to save.
    //Caveats apply when close to the final percent.

    var do_save_fold = false;

    var de = globals.errorDif; //Error Difference
    var dp = globals.stepSize/100; //How much to add to percent
    var dt = 1000; //Time between error dif
    var sigFig = 10000;

    var currentError = globals.globalErrors;

    var diffError = Math.abs(currentError-previousError);


    currentDate = new Date();
    var dateDiff=currentDate.getTime()-previousDate.getTime();

    var nextCreasePercent = globals.creasePercent;
    nextCreasePercent=Math.round(nextCreasePercent*sigFig)/sigFig;
     if (dateDiff > dt) {

        previousDate =  currentDate;
        var diffError = Math.abs(currentError-previousError);

        previousError = currentError;

        $("#errorFoldSeriesOutput").html(diffError.toPrecision(5));

        if (diffError < de || globals.skip){
            creasePercent = nextCreasePercent;
            nextCreasePercent = nextCreasePercent + dp;

            is_under_percent=creasePercent<globals.toPercent/100;
            is_above_percent=creasePercent>globals.toPercent/100;
            posStep=globals.stepSize>0;


            if(nextCreasePercent>1||nextCreasePercent<-1){
                //This line ensures the final percentage is always checked.
                if((is_under_percent&&posStep)||(is_above_percent&& !posStep)){
                    nextCreasePercent=globals.toPercent/100;
                    globals.setCreasePercent(nextCreasePercent);
                    globals.shouldChangeCreasePercent=true;
                    globals.controls.updateCreasePercent();
                }
            }else{
                globals.setCreasePercent(nextCreasePercent);
                globals.shouldChangeCreasePercent=true;
                globals.controls.updateCreasePercent();
            }
            do_save_fold = true;
            if (globals.skip){
                globals.skip=false;
                do_save_fold=false;
            }

        }
    }


    return [do_save_fold, previousError, previousDate, nextCreasePercent]
}
