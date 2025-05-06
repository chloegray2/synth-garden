const int potPin   = A0;
const int buttonPin= 2;

const int redPin   = 9;   // PWM pins
const int greenPin = 10;
const int bluePin  = 11;

int potValue = 0;
bool buttonState = false;
bool lastButtonState = false;

unsigned long lastBlinkTime = 0;
bool ledState = false;

void setup() {
  Serial.begin(9600);
  pinMode(potPin, INPUT);
  pinMode(buttonPin, INPUT_PULLUP);
  pinMode(redPin, OUTPUT);
  pinMode(greenPin, OUTPUT);
  pinMode(bluePin, OUTPUT);
}

void loop() {
  potValue = analogRead(potPin);

  // Handle day/night toggle button
  buttonState = (digitalRead(buttonPin) == LOW);
  if (buttonState && !lastButtonState) {
    Serial.println("TOGGLE_DAY_NIGHT");
  }
  lastButtonState = buttonState;

  // Send pot reading to browser
  Serial.print("POT:");
  Serial.println(potValue);

  // —— NEW: if pot is at absolute zero, turn ALL LEDs off ——
  if (potValue == 0) {
    analogWrite(redPin,   0);
    analogWrite(greenPin, 0);
    analogWrite(bluePin,  0);
  }
  // —— end zero‑guard ——

  else if (potValue < 300) {
    // Not enough light — red blinks
    blinkLED(redPin);
    analogWrite(greenPin, 0);
    analogWrite(bluePin,  0);
  }
  else if (potValue <= 700) {
    // Healthy range — green solid on
    analogWrite(greenPin, 255);
    analogWrite(redPin,   0);
    analogWrite(bluePin,  0);
  }
  else {
    // Too much light — blue blinks
    blinkLED(bluePin);
    analogWrite(redPin,   0);
    analogWrite(greenPin, 0);
  }

  delay(50);
}

void blinkLED(int pin) {
  unsigned long currentTime = millis();
  if (currentTime - lastBlinkTime >= 300) {
    ledState = !ledState;
    digitalWrite(pin, ledState ? HIGH : LOW);
    lastBlinkTime = currentTime;
  }
}