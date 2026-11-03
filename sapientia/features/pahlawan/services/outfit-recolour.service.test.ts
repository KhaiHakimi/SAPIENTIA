import { describe, expect, it } from 'vitest';
import { OUTFIT_COLOURS } from '../data/outfit-colours';
import { partOf, rampAt, recolourPixels } from './outfit-recolour.service';

const blue = OUTFIT_COLOURS.find((colour) => colour.id === 'blue')!.ramp;
const green = OUTFIT_COLOURS.find((colour) => colour.id === 'green')!.ramp;

// Colours taken from the pendekar sprite sheet.
const CLOTH = [33, 31, 41];
const SAMPIN = [123, 22, 40];
const SKIN = [250, 157, 98];
const GOLD = [236, 186, 40];
const OUTLINE = [0, 0, 1];

describe('which part a colour belongs to', () => {
  it('finds the clothes and the sampin and leaves skin, gold and outlines alone', () => {
    expect(partOf(CLOTH[0], CLOTH[1], CLOTH[2])).toBe('clothes');
    expect(partOf(SAMPIN[0], SAMPIN[1], SAMPIN[2])).toBe('sampin');
    expect(partOf(SKIN[0], SKIN[1], SKIN[2])).toBeNull();
    expect(partOf(GOLD[0], GOLD[1], GOLD[2])).toBeNull();
    expect(partOf(OUTLINE[0], OUTLINE[1], OUTLINE[2])).toBeNull();
  });
});

describe('ramps', () => {
  it('runs from the first shade to the last', () => {
    expect(rampAt(['#000000', '#ffffff'], 0)).toEqual([0, 0, 0]);
    expect(rampAt(['#000000', '#ffffff'], 1)).toEqual([255, 255, 255]);
    expect(rampAt(['#000000', '#ffffff'], 0.5)).toEqual([128, 128, 128]);
    expect(rampAt(['#000000', '#ffffff'], 7)).toEqual([255, 255, 255]);
  });
});

describe('recolouring pixels', () => {
  // A 30 x 30 picture: a 20 x 20 sampin (the real one is 1,000 to 2,600 pixels), then cloth, skin, a transparent cloth pixel and,
  // far from the sampin, one dark red like the jaw outline.
  const SIZE = 30;
  const JAW = [62, 23, 17];
  const at = (x: number, y: number) => (y * SIZE + x) * 4;
  const picture = () => {
    const data = new Uint8ClampedArray(SIZE * SIZE * 4);
    const paint = (x: number, y: number, rgb: number[], alpha = 255) => data.set([...rgb, alpha], at(x, y));
    for (let y = 0; y < 20; y += 1) for (let x = 0; x < 20; x += 1) paint(x, y, SAMPIN);
    paint(25, 5, CLOTH);
    paint(25, 10, SKIN);
    paint(25, 15, CLOTH, 0);
    paint(28, 28, JAW);
    return data;
  };
  const rgbAt = (data: Uint8ClampedArray, x: number, y: number) => Array.from(data.slice(at(x, y), at(x, y) + 3));

  it('changes only the parts given a ramp', () => {
    const data = picture();
    recolourPixels(data, SIZE, { clothes: blue });
    const cloth = rgbAt(data, 25, 5);
    expect(cloth).not.toEqual(CLOTH);
    expect(cloth[2]).toBeGreaterThan(cloth[0]); // now blue
    expect(rgbAt(data, 5, 5)).toEqual(SAMPIN);
    expect(rgbAt(data, 25, 10)).toEqual(SKIN);
    expect(rgbAt(data, 25, 15)).toEqual(CLOTH); // transparent pixels are skipped
  });

  it('recolours the sampin on its own ramp', () => {
    const data = picture();
    recolourPixels(data, SIZE, { clothes: blue, sampin: green });
    const sampin = rgbAt(data, 5, 5);
    expect(sampin[1]).toBeGreaterThan(sampin[0]); // now green
  });

  it('leaves sampin-coloured pixels far from the sampin alone, like the jaw outline', () => {
    const data = picture();
    recolourPixels(data, SIZE, { sampin: green });
    expect(rgbAt(data, 28, 28)).toEqual(JAW);
  });

  it('makes white clothes look white, not grey', () => {
    const white = OUTFIT_COLOURS.find((colour) => colour.id === 'white')!;
    const data = picture();
    recolourPixels(data, SIZE, { clothes: white.ramp });
    const [r, g, b] = rgbAt(data, 25, 5);
    expect(Math.min(r, g, b)).toBeGreaterThan(190); // a typical mid-tone of the drawn cloth lands near white
    expect(white.sampinRamp).toBeDefined(); // the white sampin uses a deeper cream so its orange songket thread reads as gold
  });

  it('leaves everything as drawn with no ramps', () => {
    const data = picture();
    recolourPixels(data, SIZE, {});
    expect(data).toEqual(picture());
  });
});
