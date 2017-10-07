import processing.pdf.*;

boolean mountValleyColors = true;
boolean dashedCreaseLines = true;

float angle = PI/3;// PI/2 > angle > 0
float edgeLength = 72;//1in and 72dpi
float diagLength = 2*edgeLength/sqrt(2);

void setup() {
  size(400, 400);
  
  //tesselation
  beginRecord(PDF, "squaretwisttesselation.pdf"); 
  background(255);
  
  makeUnitCell(200,200);
  
  endRecord();
  
  //single twist
  beginRecord(PDF, "squaretwist.pdf"); 
  background(255);
  makeSingleUnitCell(width/2,height/2);
  endRecord();
  
  //many single twists
  size(700, 700);
  beginRecord(PDF, "squaretwistManyAngles.pdf"); 
  
  background(255);
  for (int i=0;i<3;i++){
    for (int j=0;j<3;j++){
      float index = i*3+j;
      angle = map(index, 0, 8, PI/6, 2*PI/6); 
      makeSingleUnitCell(j*width/3+width/6,i*height/3+height/6);
    }
  }
  
  endRecord();

//  // Exit the program 
  println("Finished.");
  exit();
}

void makeSingleUnitCell(float x, float y){
  makeUnitCell(x, y, true, true, true, true, true);
}

void makeUnitCell(float x, float y){
  makeUnitCell(x, y, false, false, false, false, false);
}

void makeUnitCell(float x, float y, boolean allBounds, 
boolean leftBounds, boolean topBounds, boolean bottomBounds, boolean rightBounds){
  pushMatrix();
  translate(x, y);
  rotate(-angle/2);
  
  setMountainColor();
  //top
  float square1X = diagLength/2*sin(angle-PI/4);
  float square1Y = -diagLength/2*cos(angle-PI/4);

  //right
  float square2X = diagLength/2*sin(angle+PI/4);
  float square2Y = -diagLength/2*cos(angle+PI/4);
  
  drawCrease(square1X, square1Y, square1X, square1Y-edgeLength);
  drawCrease(-square1X, -square1Y, -square1X, -square1Y+edgeLength);
  
  drawCrease(square2X, square2Y, square2X+edgeLength, square2Y);
  drawCrease(-square2X, -square2Y, -square2X-edgeLength, -square2Y);
  
  //inner square
  drawCrease(square1X, square1Y, square2X, square2Y);
  drawCrease(square1X, square1Y, -square2X, -square2Y);
  drawCrease(-square1X, -square1Y, square2X, square2Y);
  drawCrease(-square1X, -square1Y, -square2X, -square2Y);
  
  //bounds
  if (allBounds) setCutColor();
  
  if (leftBounds){
    //left
    line(square1X-edgeLength, square1Y-edgeLength, square1X-edgeLength, square1Y);
    line(square1X-edgeLength, square1Y, -square2X-edgeLength, -square2Y);
    line(-square2X-edgeLength, -square2Y, -square2X-edgeLength, -square2Y+edgeLength);
  }
  
  if (topBounds){
    //top
    line(square1X, square1Y-edgeLength, square1X-edgeLength, square1Y-edgeLength);
    line(square1X, square1Y-edgeLength, square2X, square2Y-edgeLength);
    line(square2X, square2Y-edgeLength, square2X+edgeLength, square2Y-edgeLength);
  }
  
  if (rightBounds){
    //right
    line(square2X+edgeLength, square2Y-edgeLength, square2X+edgeLength, square2Y);
    line(square2X+edgeLength, square2Y, -square1X+edgeLength, -square1Y);
    line(-square1X+edgeLength, -square1Y, -square1X+edgeLength, -square1Y+edgeLength);
  }
  
  if (bottomBounds){
    //bottom
    line(-square1X+edgeLength, -square1Y+edgeLength, -square1X, -square1Y+edgeLength);
    line(-square1X, -square1Y+edgeLength, -square2X, -square2Y+edgeLength);
    line(-square2X, -square2Y+edgeLength, -square2X-edgeLength, -square2Y+edgeLength);
  }
  
  setValleyColor();
  drawCrease(square1X, square1Y, square1X-edgeLength, square1Y);
  drawCrease(-square1X, -square1Y, -square1X+edgeLength, -square1Y);
  
  drawCrease(square2X, square2Y, square2X, square2Y-edgeLength);
  drawCrease(-square2X, -square2Y, -square2X, -square2Y+edgeLength);
  
  popMatrix();
}

void setMountainColor(){
  if (mountValleyColors){
    stroke(0,0,255);//blue
  } else {
    setCreaseColor();
  }
}

void setValleyColor(){
  if (mountValleyColors){
    stroke(255,0,0);//red
  } else {
    setCreaseColor();
  }
}

void setCutColor(){
  stroke(0);//black
}

void setCreaseColor(){
  stroke(255,0,0);//red
}

void drawCrease(float x1, float y1, float x2, float y2){
  if (dashedCreaseLines){
    dashedLine(x1, y1, x2, y2, 6, 6);
  } else {
    line(x1, y1, x2, y2);
  }
}

void dashedLine(float x1, float y1, float x2, float y2, float dashLength, float spaceLength){
  pushMatrix();
  translate(x1, y1);
  rotate(atan2(y2-y1, x2-x1));
  float lineLength = sqrt((y2-y1)*(y2-y1) + (x2-x1)*(x2-x1));
  float partialDash = lineLength/(dashLength+spaceLength) - floor(lineLength/(dashLength+spaceLength));
  for (float i=(partialDash+spaceLength)/2;i<lineLength;i+=dashLength+spaceLength){
    line(i, 0, i+dashLength, 0);
  }
  popMatrix();
}

