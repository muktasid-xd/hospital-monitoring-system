
#include <DHT.h>
#include <SoftwareSerial.h>

// -------- Pins --------
#define DHTPIN         2
#define DHTTYPE        DHT11
#define SOUND_ANALOG   A0
#define SOUND_DIGITAL  3
#define LDR_PIN        A1
#define BUZZER         9

// -------- Thresholds (calibrate on site) --------
const float TEMP_MIN    = 18.0, TEMP_MAX = 26.0;  // °C
const float HUM_MIN     = 30.0, HUM_MAX  = 60.0;  // %
const int   SOUND_LIMIT = 75;   // peak-to-peak (0-1023)
const int   LIGHT_LIMIT = 600;   // raw LDR value, higher = brighter

// -------- Timing --------
const unsigned long DHT_INTERVAL   = 2000;  // ms, DHT11 needs >= 1 s
const unsigned long PRINT_INTERVAL = 500;   // ms, how often the array is sent

DHT dht(DHTPIN, DHTTYPE);
SoftwareSerial link(10, 11);     // RX, TX -> Wi-Fi/Bluetooth module

// -------- Data array --------
// [0] temperature °C
// [1] humidity %
// [2] light level (0-1023)
// [3] sound level (peak-to-peak 0-1023)
// [4] environment alert (1 = temp/humidity out of range)
// [5] emergency sound alert (1 = loud noise)
// [6] bio-medical light alert (1 = light too high)
float data[7];

unsigned long lastDHT = 0;
unsigned long lastPrint = 0;
float lastTemp = 0, lastHum = 0;

// ------------------------------------------------
int readSoundLevel() {
  unsigned long start = millis();
  int sMax = 0, sMin = 1023;
  while (millis() - start < 50) {        // 50 ms sampling window
    int v = analogRead(SOUND_ANALOG);
    if (v > sMax) sMax = v;
    if (v < sMin) sMin = v;
  }
  return sMax - sMin;
}

// Sound alert  -> continuous tone
// Light alert  -> fast beeping (200 ms)
// Both         -> continuous
void updateBuzzer() {
  if (data[5] == 1) {
    digitalWrite(BUZZER, HIGH);
  } else if (data[6] == 1) {
    bool on = (millis() / 200) % 2 == 0;
    digitalWrite(BUZZER, on ? HIGH : LOW);
  } else {
    digitalWrite(BUZZER, LOW);
  }
}

void sendArray(Stream &out) {
  out.print('[');
  for (int i = 0; i < 7; i++) {
    out.print(data[i], (i < 2) ? 1 : 0);   // 1 decimal for temp/humidity
    if (i < 6) out.print(',');
  }
  out.println(']');
}

// ------------------------------------------------
void setup() {
  Serial.begin(9600);
  link.begin(9600);
  dht.begin();

  pinMode(SOUND_DIGITAL, INPUT);
  pinMode(BUZZER, OUTPUT);
  digitalWrite(BUZZER, LOW);
}

void loop() {
  // Temperature & humidity (every 2 s)
  if (millis() - lastDHT >= DHT_INTERVAL) {
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t) && !isnan(h)) {
      lastTemp = t;
      lastHum  = h;
    }
    lastDHT = millis();
  }

  // Light & sound (every loop)
  int light = analogRead(LDR_PIN);
  int sound = readSoundLevel();

  data[0] = lastTemp;
  data[1] = lastHum;
  data[2] = light;
  data[3] = sound;
  data[4] = (lastTemp < TEMP_MIN || lastTemp > TEMP_MAX ||
             lastHum  < HUM_MIN  || lastHum  > HUM_MAX) ? 1 : 0;
  data[5] = (sound > SOUND_LIMIT) ? 1 : 0;
  data[6] = (light > LIGHT_LIMIT) ? 1 : 0;

  // Buzzer is updated every loop so beeping stays even
  updateBuzzer();

  // Send the array every 500 ms
  if (millis() - lastPrint >= PRINT_INTERVAL) {
    sendArray(Serial);   // USB -> Node-RED Serial In
    sendArray(link);     // Wi-Fi / Bluetooth module
    lastPrint = millis();
  }
}