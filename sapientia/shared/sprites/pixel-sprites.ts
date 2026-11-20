/**
 * Small pixel icons for the interface (doors, torches, coins, avatars). Each sprite is a grid of palette letters; '.' is
 * transparent. The painted pahlawan and monsters are pictures instead; see features/characters.
 */
export const PIXEL_PALETTE: Record<string, string> = {
  k: '#0f1218', d: '#5a3a1c', W: '#a9743a',
  G: '#f2b632', g: '#d89a1e', o: '#9a6410',
  R: '#e2483d', S: '#c9d1de', s: '#8793a6',
  n: '#2f9e63', N: '#7fd6a4', p: '#efe6cf',
  f: '#ee7f1e', F: '#ffd24a', b: '#4f86e0', r: '#a5281e', e: '#f0c8a0',
};

export const PIXEL_SPRITES = {
  door: [
    '...kkkkkk...', '..kkddddkk..', '.kdWWddWWdk.', '.kdWWddWWdk.', '.kdWWddWWdk.', '.kdWWddWWdk.', '.kdWWddWWdk.',
    '.kdWWddWgdk.', '.kdWWddWWdk.', '.kdWWddWWdk.', '.kdWWddWWdk.', '.kdWWddWWdk.', '.kdWWddWWdk.', 'kkkkkkkkkkkk',
  ],
  check: [
    '............', '..........nn', '.........nNn', '........nNn.', 'nn.....nNn..', 'nNn...nNn...',
    '.nNn.nNn....', '..nNnNn.....', '...nNn......', '....n.......', '............', '............',
  ],
  skull: [
    '...kkkkkk...', '..kSSSSSSk..', '.kSSSSSSSSk.', '.kSSSSSSSSk.', '.kSkkSSkkSk.', '.kSkRSSRkSk.',
    '.kSSSkkSSSk.', '..kSSSSSSk..', '..kSkSSkSSk.', '...kkkkkk...',
  ],
  key: [
    '............', '............', '..kkkk......', '.kGGGGk.....', 'kGgkkgGkkkkk', 'kGg..gGGGGGk',
    'kGgkkgGkkGGk', '.kGGGGk..kGk', '..kkkk....kk', '............', '............', '............',
  ],
  flame: [
    '.....kk.....', '....kFFk....', '....kFFFk...', '...kFFFFk...', '..kFFffFFk..', '..kFffffFk..',
    '..kFfffffk..', '.kfffRRfffk.', '.kffRRRRffk.', '.kfffRRfffk.', '..kkfffffkk.', '....kkkkkk..',
  ],
  scroll: [
    '............', '.kkkkkkkkkk.', 'kppppppppppk', 'kpkkkkkkkppk', 'kppppppppppk', 'kpkkkkkkpppk',
    'kppppppppppk', 'kpkkkkkkkppk', 'kppppppppppk', '.kkkkkkkkkk.', '............', '............',
  ],
  crown: [
    '............', '............', '.kk..kk..kk.', '.kGk.kGk.kGk', '.kGGkGGGkGGk', '.kGGGGGGGGk.',
    '.kGGRGGGbGGk', '.kgggggggggk', '.kkkkkkkkkk.', '............', '............', '............',
  ],
  trophy: [
    '............', '..kkkkkkkk..', 'kkkGGGGGGkkk', 'kGkGGGGGGkGk', 'kGkGGGGGGkGk', '.kkGgGGGGkk.',
    '...kGgGGGk..', '....kGGGk...', '.....kGk....', '....kGGGk...', '...kooooook.', '...kkkkkkk..',
  ],
  owl: [
    '............', '..k......k..', '..kkkkkkkk..', '.kWWWWWWWWk.', '.kWpkWWkpWk.', '.kWpkWWkpWk.',
    '.kWWWGGWWWk.', '.kWWpWWpWWk.', '.kWWpWWpWWk.', '..kWWWWWWk..', '...kGkkGk...', '............',
  ],
  squire: [
    '...kkkkkk...', '..kddddddk..', '.kddddddddk.', '.kdeeeeeedk.', '.keekeekeek.', '.keeeeeeeek.',
    '..keeRReek..', '...kkeekk...', '..knnnnnnk..', '.knnnGGnnnk.', '.knnnnnnnnk.', '.kkkkkkkkkk.',
  ],
  knight: [
    '.....RR.....', '...kkRRkk...', '..kSSSSSSk..', '.kSSSSSSSSk.', '.kSkkkkkkSk.', '.kSsssssssk.',
    '.kSSSkkSSSk.', '..kSSSSSSk..', '.kssSSSSssk.', 'kssSSRRSSssk', '.kSSSSSSSSk.', '.kkkkkkkkkk.',
  ],
  mage: [
    '.....kk.....', '....kbbk....', '...kbbbbk...', '..kbbGbbbk..', '.kbbbbbbbbk.', 'kkkkkkkkkkkk',
    '..keeeeeek..', '..kekeekek..', '..kppppppk..', '.kbpppppbk..', '.kbbbppbbbk.', '.kkkkkkkkkk.',
  ],
  seal: [
    '....kkkk....', '..kkRRRRkk..', '.kRRRRRRRRk.', '.kRRRrrRRRk.', 'kRRRrRRrRRRk', 'kRRrrrrrrRRk',
    'kRRRrRRrRRRk', '.kRRRrrRRRk.', '.kRRRRRRRRk.', '..kkRRRRkk..', '....kkkk....', '............',
  ],
  coin: ['..kkkk..', '.kGGGGk.', 'kGGgGGok', 'kGGgGGok', 'kGGgGGok', 'kGGGGGok', '.kooook.', '..kkkk..'],
} as const satisfies Record<string, readonly string[]>;

export type PixelSpriteName = keyof typeof PIXEL_SPRITES;
