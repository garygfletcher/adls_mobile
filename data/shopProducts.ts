export type Product = {
  id: string;
  name: string;
  price: number;
  sizes?: string[];
  colors?: string[];
  note?: string;
};

export const shopProducts: Product[] = [
  {
    id: 'association-house-flag',
    name: 'Association House Flag (Defaced St. George\'s Cross) Owner Members only',
    price: 55,
  },
  {
    id: 'association-jack',
    name: 'Association Jack (Undefaced St.George\'s Cross) Owner Members only',
    price: 30,
  },
  {
    id: 'dunkirk-1940-brass-plaques',
    name: 'Dunkirk 1940 Brass Plaques - Owner Members only',
    price: 70,
  },
  {
    id: 'sweatshirts-ordering-1-3-navy',
    name: 'Association of Dunkirk Little Ships Sweatshirts - ordering 1-3 - Navy',
    price: 26,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Navy'],
  },
  {
    id: 'sweatshirts-ordering-4-plus-navy',
    name: 'Association of Dunkirk Little Ships Sweatshirts - ordering 4+ - Navy',
    price: 22,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Navy'],
  },
  {
    id: 'polo-shirts-white-or-navy',
    name: 'Association of Dunkirk Little Ships Polo shirts - White or Navy',
    price: 23,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['White', 'Navy'],
  },
  {
    id: 'fleeces-navy',
    name: 'Association of Dunkirk Little Ships Fleeces - navy',
    price: 37,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Navy'],
  },
  {
    id: 'baseball-caps-navy',
    name: 'Association of Dunkirk Little Ships Baseball Caps in navy, with the ADLS Logo',
    price: 9.5,
    colors: ['Navy'],
  },
  {
    id: 'beanie-hat-navy',
    name: 'Association of Dunkirk Little Ships Beanie Hat in navy, with the ADLS Logo',
    price: 9.5,
    colors: ['Navy'],
  },
  {
    id: 'silk-ties',
    name: 'Association of Dunkirk Little Ships Silk Ties, embroidered ADLS Logo',
    price: 27.5,
  },
  {
    id: 'souvenir-booklets',
    name: 'Association of Dunkirk Little Ships Souvenir Booklets',
    price: 2,
  },
  {
    id: 'brooch',
    name: 'Association of Dunkirk Little Ships Brooch',
    price: 6.5,
  },
  {
    id: 'mugs',
    name: 'Association of Dunkirk Little Ships Mugs - Dunkirk Little Ships, Daily Express article',
    price: 5,
  },
  {
    id: 'blazer-badges',
    name: 'Association of Dunkirk Little Ships Blazer Badges',
    price: 20,
  },
];

export const pricingNotice =
  "All prices are from the provided ADLS 2023 price list and include P+P where indicated.";
