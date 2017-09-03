import processing.pdf.*;

float numSegs = 100;//number of radial segments, this can be reduced to 4 to do a regular hypar
float outerRad = 200;//radius of outer border
float spacing = 8;//radial space between neighboring creases
int numPleats = 7;//number of mountain/valley pairs of circular creases

boolean antisym = true;//symmetric vs antisymmetric triangulation
boolean triangulationsAsHinges = false;//draw triangulations as facets creases (yellow) or undriven hinges (magenta)

void setup(){
  
  size(450, 450);
  
  //tessellation
  beginRecord(PDF, "Hypar.pdf"); 
  background(255);
  pushMatrix();
  translate(width/2, height/2);
  
  //outer border
  stroke(0);
  drawRing(outerRad);
  
  //creases and triangulations
  float rad = outerRad;
  for (int i=0;i<numPleats;i++){
    drawHinges(rad, true);
    rad -= spacing;
    stroke(255,0,0);
    drawRing(rad);
    drawHinges(rad, false);
    rad -= spacing;
    stroke(0,0,255);
    drawRing(rad);
  }
  drawHinges(rad, true);
  
  //inner border
  rad -= spacing;
  stroke(0);
  drawRing(rad);
  
  //radial facet creases
  stroke(255,255,0);
  for (float i=0;i<numSegs;i++){
    float theta = i/numSegs*2*PI;
    line(outerRad*cos(theta), outerRad*sin(theta), rad*cos(theta), rad*sin(theta));
  }
  
  endRecord();
  println("Finished.");
//  exit();
}

void drawHinges(float rad, boolean opp){
  if (triangulationsAsHinges) stroke(255,0,255);
  else stroke(255,255,0);
  for (float i=0;i<numSegs;i++){
    float theta = i/numSegs*2*PI;
    if (antisym){
      if (opp){
        if (i%2==0) line(rad*cos(theta), rad*sin(theta), (rad-spacing)*cos(theta-1.0/numSegs*2*PI), (rad-spacing)*sin(theta-1.0/numSegs*2*PI));
        else line((rad-spacing)*cos(theta), (rad-spacing)*sin(theta), rad*cos(theta-1.0/numSegs*2*PI), rad*sin(theta-1.0/numSegs*2*PI));
      } else {
        if (i%2==1) line(rad*cos(theta), rad*sin(theta), (rad-spacing)*cos(theta-1.0/numSegs*2*PI), (rad-spacing)*sin(theta-1.0/numSegs*2*PI));
        else line((rad-spacing)*cos(theta), (rad-spacing)*sin(theta), rad*cos(theta-1.0/numSegs*2*PI), rad*sin(theta-1.0/numSegs*2*PI));
      }
    } else{
      if (i%2==0) line(rad*cos(theta), rad*sin(theta), (rad-spacing)*cos(theta-1.0/numSegs*2*PI), (rad-spacing)*sin(theta-1.0/numSegs*2*PI));
      else line((rad-spacing)*cos(theta), (rad-spacing)*sin(theta), rad*cos(theta-1.0/numSegs*2*PI), rad*sin(theta-1.0/numSegs*2*PI));
    }
  }
}

void drawRing(float rad){
  for (float i=0;i<numSegs;i++){
    float theta = i/numSegs*2*PI;
    line(rad*cos(theta), rad*sin(theta), rad*cos(theta-1.0/numSegs*2*PI), rad*sin(theta-1.0/numSegs*2*PI));
  }
}


