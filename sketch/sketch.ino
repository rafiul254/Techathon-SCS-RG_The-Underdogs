#define FLAME_PIN 13
#define GAS_PIN 34
#define WATER_PIN 35
#define PIR_PIN 14
#define LED_GREEN 25
#define LED_YELLOW 26
#define LED_RED 27
#define BUZZER_PIN 32

int fireCount = 0;
unsigned long bootTime = 0;
const int DEBOUNCE_COUNT = 5;
const int WARMUP_SECONDS = 30;

void setup() {
  Serial.begin(115200);
  pinMode(FLAME_PIN, INPUT);
  pinMode(PIR_PIN, INPUT);
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_YELLOW, OUTPUT);
  pinMode(LED_RED, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  bootTime = millis();
  Serial.println("[BOOT] Zone node starting...");
  Serial.println("[WARMUP] Gas readings suppressed for 30s");
}

void loop() {
  // Read sensors
  int fireRaw = digitalRead(FLAME_PIN);
  int gasRaw = analogRead(GAS_PIN);
  int waterRaw = analogRead(WATER_PIN);
  int pirRaw = digitalRead(PIR_PIN);

  // Debounce fire
  if (fireRaw == HIGH) fireCount++;
  else fireCount = 0;
  int fireConfirmed = (fireCount >= DEBOUNCE_COUNT) ? 1 : 0;

  // Warmup check
  bool warmupDone = (millis() - bootTime) > (WARMUP_SECONDS * 1000UL);
  float gasNorm = warmupDone ? (gasRaw / 4095.0) : 0.0;
  float waterNorm = waterRaw / 4095.0;

  // Send raw values to backend (server computes risk)
  Serial.print("{\"fire\":");
  Serial.print(fireConfirmed);
  Serial.print(",\"gas\":");
  Serial.print(gasNorm, 2);
  Serial.print(",\"water\":");
  Serial.print(waterNorm, 2);
  Serial.print(",\"occupancy\":");
  Serial.print(pirRaw);
  Serial.println("}");

  // Local LED feedback (from backend command)
  if (fireConfirmed) {
    digitalWrite(LED_GREEN, LOW);
    digitalWrite(LED_YELLOW, LOW);
    digitalWrite(LED_RED, HIGH);
    digitalWrite(BUZZER_PIN, HIGH);
    Serial.println("[CRITICAL] Fire confirmed!");
  } else if (gasNorm > 0.3) {
    digitalWrite(LED_GREEN, LOW);
    digitalWrite(LED_YELLOW, HIGH);
    digitalWrite(LED_RED, LOW);
    digitalWrite(BUZZER_PIN, LOW);
    Serial.println("[WARNING] Gas elevated");
  } else {
    digitalWrite(LED_GREEN, HIGH);
    digitalWrite(LED_YELLOW, LOW);
    digitalWrite(LED_RED, LOW);
    digitalWrite(BUZZER_PIN, LOW);
  }

  delay(500);
}
