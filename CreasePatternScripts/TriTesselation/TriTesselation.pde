import processing.pdf.*;

float triangleHeight = 40;//40px/72dpi = ~0.55in tall
boolean dashedCreaseLines = true;

void setup() {
  
  //20in*72dpi= 1440px
  size(1440, 1440, PDF, "tritesselation.pdf");
  background(255);
  
  //horizontal lines
  for (float i=triangleHeight;i<height;i+=triangleHeight){
    drawCrease(0, i, width, i);
  }
  
  //   \\\\\\ lines
  for (float i=-height/sqrt(3);i<width;i+=2*triangleHeight/sqrt(3)){
    
    float xPos = i+height/sqrt(3);
    if (xPos>width){
      float xDiff = xPos-width;
      drawCrease(i, 0, width, height-xDiff*sqrt(3));
    } else if (i<0){
      float xDiff = -i;
      drawCrease(0, xDiff*sqrt(3), i+height/sqrt(3), height);
    } else {
      drawCrease(i, 0, i+height/sqrt(3), height);
    }
  }
  
  //   //////// lines
  for (float i=0;i<width+height/sqrt(3);i+=2*triangleHeight/sqrt(3)){
    
    float xPos = i-height/sqrt(3);
    if (i>width){
      float xDiff = i-width;
      drawCrease(width, xDiff*sqrt(3), i-height/sqrt(3), height);
    } else if (xPos<0){
      float xDiff = -xPos;
      drawCrease(i, 0, 0, height - xDiff*sqrt(3));
    } else {
      drawCrease(i, 0, i-height/sqrt(3), height);
    }
 
  }
  
  // Exit the program 
  println("Finished.");
  exit();
}

void drawCrease(float x1, float y1, float x2, float y2){
  if (dashedCreaseLines){
    float numDashesPerSide = 5;
    float dashLength = triangleHeight*2/sqrt(3)/(numDashesPerSide*2);
    dashedLine(x1, y1, x2, y2, dashLength, dashLength);
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
  println(partialDash);
  for (float i=(partialDash+spaceLength)/2;i<lineLength;i+=dashLength+spaceLength){
    line(i, 0, i+dashLength, 0);
  }
  popMatrix();
}
