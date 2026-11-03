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
  const pixels = () => Uint8ClampedArray.from([...CLOTH, 255, ...SAMPIN, 255, ...SKIN, 255, ...CLOTH, 0]);

  it('changes only the parts given a ramp', () => {
    const data = pixels();
    recolourPixels(data, { clothes: blue });
    const cloth = Array.from(data.slice(0, 3));
    expect(cloth).not.toEqual(CLOTH);
    expect(cloth[2]).toBeGreaterThan(cloth[0]); // now blue
    expect(Array.from(data.slice(4, 7))).toEqual(SAMPIN);
    expect(Array.from(data.slice(8, 11))).toEqual(SKIN);
    expect(Array.from(data.slice(12, 15))).toEqual(CLOTH); // transparent pixels are skipped
  });

  it('recolours the sampin on its own ramp', () => {
    const data = pixels();
    recolourPixels(data, { clothes: blue, sampin: green });
    const sampin = Array.from(data.slice(4, 7));
    expect(sampin[1]).toBeGreaterThan(sampin[0]); // now green
  });

  it('leaves everything as drawn with no ramps', () => {
    const data = pixels();
    recolourPixels(data, {});
    expect(data).toEqual(pixels());
  });
});
