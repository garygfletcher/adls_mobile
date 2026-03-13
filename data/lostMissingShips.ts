export type LostMissingShip = {
  name: string;
  status: string;
  imageUrl?: string;
};

const IMG_BASE = 'https://static.wixstatic.com/media/';
const NO_IMAGE = `${IMG_BASE}5831d6_a88eeded83b649c483c1ec83a6acdfe9~mv2.jpg`;

export const lostMissingShips: LostMissingShip[] = [
  { name: 'ALUSIA', status: 'Missing', imageUrl: `${IMG_BASE}5831d6_7a4c91b32fa54d999a2ec5a0edd14fcc~mv2.jpg` },
  { name: 'ATLANTIDE', status: 'Known Non Member', imageUrl: `${IMG_BASE}5831d6_49c28c73dfdf4c8cbd9fecc83415f274~mv2.jpg` },
  { name: 'BLUEBIRD OF CHELSEA', status: 'Known Non Member', imageUrl: `${IMG_BASE}5831d6_a8074d7fbe5848c3a6ca7b5533e95bee~mv2.jpg` },
  { name: 'BOUNTY', status: 'Known Non Member', imageUrl: NO_IMAGE },
  { name: 'BRAYMAR', status: 'Lost', imageUrl: `${IMG_BASE}5831d6_63b3aee6da7240e98b7c890b316ce2a7~mv2.jpg` },
  { name: 'CABBY', status: 'Known Non Member', imageUrl: `${IMG_BASE}5831d6_163b34e967ec44009940a319522b3ae5~mv2.jpg` },
  { name: 'CAPTAIN CHRISTIANSEN', status: 'Known Non Member', imageUrl: `${IMG_BASE}5831d6_5c3f96f4b13441c89c6e7c5f6afe4b4e~mv2.jpg` },
  { name: 'COUNT DRACULA', status: 'Known Non Member', imageUrl: `${IMG_BASE}5831d6_a33ffb5b58b04b04a43db4ddce6d31d4~mv2.jpg` },
  { name: 'COUNT DRACULAR', status: 'Known Non Member', imageUrl: `${IMG_BASE}5831d6_a33ffb5b58b04b04a43db4ddce6d31d4~mv2.jpg` },
  { name: 'DAWN', status: 'Missing', imageUrl: NO_IMAGE },
  { name: 'DOUTELLE', status: 'Lost', imageUrl: `${IMG_BASE}5831d6_4101d231567b464990230031884af9c5~mv2.jpg` },
  { name: 'ENA', status: 'Known Non Member', imageUrl: `${IMG_BASE}5831d6_7ad3434b49574d3fa9db141f63c5f9a2~mv2.jpg` },
  { name: 'EOTHEN', status: 'Lost', imageUrl: `${IMG_BASE}5831d6_335771a02eeb4b8383613d8133480544~mv2.jpg` },
  { name: 'ETHEL MAUD', status: 'Missing', imageUrl: `${IMG_BASE}5831d6_122739cd51aa40ff99e640f26c681adc~mv2.jpg` },
  { name: 'FAIRWIND', status: 'Missing', imageUrl: `${IMG_BASE}5831d6_6ee34b9004094b19b06ecbba0b7adf65~mv2.jpg` },
  { name: 'FALCON II', status: 'Lost', imageUrl: `${IMG_BASE}5831d6_374569ab6f804179bbb5f7a3b2646ad9~mv2.jpg` },
  { name: 'FELICITY', status: 'Known Non Member', imageUrl: `${IMG_BASE}5831d6_4329afa8caed407abbb116e0ef0e6d72~mv2.jpg` },
  { name: 'FORTY TWO', status: 'Missing', imageUrl: `${IMG_BASE}5831d6_081531b94f3343f98b91b5a91b19560d~mv2.jpg` },
  { name: 'GAY CRUSADER', status: 'Missing', imageUrl: `${IMG_BASE}5831d6_23194a3a260845ebb3f3e26f72fcc928~mv2.jpg` },
  { name: 'GIRL GUIDE', status: 'Known Non Member', imageUrl: `${IMG_BASE}5831d6_f710d6c2a2784d46bc803a58ccddf3db~mv2.jpg` },
  { name: 'GLENWAY', status: 'Missing', imageUrl: NO_IMAGE },
  { name: 'HURLINGHAM', status: 'Known Non Member', imageUrl: `${IMG_BASE}5831d6_b0f5ae75ab4e42078e4d8a76e9fcf8a4~mv2.jpg` },
  { name: 'KINGWOOD', status: 'Known Non Member', imageUrl: `${IMG_BASE}5831d6_1038d0c0a82649f3ada623d4aa17310b~mv2.jpg` },
  { name: 'LADY CABLE', status: 'Missing', imageUrl: `${IMG_BASE}5831d6_bfb2730a37414ab7a8e9dfbb34e5648c~mv2.jpg` },
  { name: 'LADY HAIG', status: 'Known Non Member', imageUrl: `${IMG_BASE}5831d6_f0b5497e48c640cbbafcbdc57a44d33c~mv2.jpg` },
  { name: 'LADY ISABELLE', status: 'Known Non Member', imageUrl: `${IMG_BASE}5831d6_8ecf03e3d7b04f0490b74bd5ca212386~mv2.jpg` },
  { name: 'LAMOUETTE', status: 'Known Non Member', imageUrl: `${IMG_BASE}5831d6_fa542a5848734ad7857427abbe09dfac~mv2.jpg` },
  { name: 'LOUISE STEPHENS', status: 'Missing', imageUrl: `${IMG_BASE}5831d6_fb88ad0bb25541fb9306f25857da6fa6~mv2.jpg` },
  { name: 'MONARCH', status: 'Lost', imageUrl: `${IMG_BASE}5831d6_645108756cd6427595a75f1bcdf644dc~mv2.jpg` },
  { name: 'NOTTAC', status: 'Lost', imageUrl: `${IMG_BASE}5831d6_4ffefc7745da4ce2b81e43cd78889540~mv2.jpg` },
  { name: 'PATRICIA', status: 'Lost', imageUrl: `${IMG_BASE}5831d6_9d101f6f6c5d4f709e0e60251ee7767a~mv2.jpg` },
  { name: 'PROVIDENCE', status: 'Missing', imageUrl: `${IMG_BASE}5831d6_52fcd98bb4104eb5b1e6eed635e009f0~mv2.jpg` },
  { name: 'RESOLUTE', status: 'Lost', imageUrl: `${IMG_BASE}5831d6_31be9b9a4d344a41a32e3bad9fd393f5~mv2.jpg` },
  { name: 'RUMMY II', status: 'Lost', imageUrl: `${IMG_BASE}5831d6_71ba73389bdc4d5084a5f88e8d80c228~mv2.jpg` },
  { name: 'SALVOR', status: 'Missing', imageUrl: `${IMG_BASE}5831d6_42f6ea137dd446d6b397ceb234002a16~mv2.jpg` },
  { name: 'SINGAPORE', status: 'Missing', imageUrl: `${IMG_BASE}5831d6_ea5b7aac3c564f8bb01e07d132533619~mv2.jpg` },
  { name: 'SNOW BUNTING', status: 'Lost', imageUrl: `${IMG_BASE}5831d6_b7b9da6d370949f8a4678e831eafd209~mv2.jpg` },
  { name: 'SOUTHSEA BELLE', status: 'Missing', imageUrl: `${IMG_BASE}5831d6_0fa21563dd7849fea1f65e00038ee088~mv2.jpg` },
  { name: 'TANTALUS', status: 'Lost', imageUrl: `${IMG_BASE}5831d6_f7e987b56bb44ab287e71ed1320bb507~mv2.jpg` },
  { name: 'THE KING', status: 'Known Non Member', imageUrl: `${IMG_BASE}5831d6_bace71cf4a4046a39ea38e4c3878ca14~mv2.jpg` },
  { name: 'THELMAR', status: 'Missing', imageUrl: `${IMG_BASE}5831d6_744a5d39d905412abd8ee6bbeabeb978~mv2.jpg` },
  { name: 'VANGUARD', status: 'Known Non Member', imageUrl: `${IMG_BASE}5831d6_a9285c1f003d497c9f3466103b6e037f~mv2.jpg` },
  { name: 'VERE', status: 'Lost', imageUrl: `${IMG_BASE}5831d6_e9811c9a9822462e998421dd2cf67885~mv2.jpg` },
  { name: 'VISCOUNT', status: 'Missing', imageUrl: `${IMG_BASE}5831d6_31532634d643494e85ca3559ac33238b~mv2.jpg` },
  { name: 'WARRIOR', status: 'Missing', imageUrl: `${IMG_BASE}5831d6_d60402f9820a45cdb3c06967966c4c25~mv2.jpg` },
];
