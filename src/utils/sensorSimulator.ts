// Proper sensor simulation with debounce + warm-up
export class ZoneSensorSimulator {
    private bootTime: number;
    private fireReadings: number[] = [];
    private readonly DEBOUNCE_COUNT = 5;
    private readonly WARMUP_SECONDS = 30;

    constructor() {
        this.bootTime = Date.now();
    }

    private isWarmupComplete(): boolean {
        return (Date.now() - this.bootTime) / 1000 > this.WARMUP_SECONDS;
    }

    // Fire debounce: 5 consecutive HIGH = confirmed
    processFireReading(raw: number): number {
        this.fireReadings.push(raw);
        if (this.fireReadings.length > this.DEBOUNCE_COUNT) {
            this.fireReadings.shift();
        }
        const allHigh = this.fireReadings.length === this.DEBOUNCE_COUNT
            && this.fireReadings.every(r => r > 0.5);
        return allHigh ? 1 : 0;
    }

    // Gas: ignore during warmup, normalize 0-1
    processGasReading(raw: number): number {
        if (!this.isWarmupComplete()) return 0; // warm-up suppression
        return Math.max(0, Math.min(1, raw));
    }

    // Water: normalize 0-1, reject negative (edge case f)
    processWaterReading(raw: number): number {
        if (raw < 0) throw new Error('Invalid water level: negative value rejected');
        return Math.max(0, Math.min(1, raw));
    }
}
