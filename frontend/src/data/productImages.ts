// Product photos, keyed by SKU, from Unsplash (Unsplash License) and Pexels (Pexels License).
// Both licenses allow free use without attribution, so credits are not shown in the UI; the
// photographer and photo page for every image are kept here as the record of each source.
// Each photo was checked by eye against its product. Products without an honest match get a
// placeholder instead. Images are served by each site's CDN (not stored in this repository).

export type ProductPhoto =
  | {
      source: 'unsplash'
      photo: string // file name on images.unsplash.com
      id: string // photo page: https://unsplash.com/photos/<id>
      author: string
    }
  | {
      source: 'pexels'
      id: string // numeric photo id on images.pexels.com
      page: string // photo page path on pexels.com
      author: string
    }

export const sourceName = { unsplash: 'Unsplash', pexels: 'Pexels' } as const

export const productPhotos: Record<string, ProductPhoto> = {
  'OUT-002': { source: 'pexels', id: '31443013', page: '/photo/camping-gear-inflatable-pillow-on-sleeping-pad-31443013/', author: 'Mykhailo Petrushchak' },
  'OUT-005': { source: 'pexels', id: '20413588', page: '/photo/portable-electric-lamp-20413588/', author: 'Buğra Özcan' },
  'ELE-012': { source: 'pexels', id: '4148576', page: '/photo/smart-plug-electric-socket-4148576/', author: 'Kenny Ginapp' },
  'HOM-009': { source: 'pexels', id: '33429884', page: '/photo/wooden-bathroom-organizer-with-bath-essentials-33429884/', author: 'Jose Canisio' },
  'HOM-010': { source: 'pexels', id: '13983948', page: '/photo/a-stand-fan-beside-a-white-wall-13983948/', author: 'Obsolete Lense' },
  'FIT-006': { source: 'pexels', id: '8497736', page: '/photo/man-and-woman-drinking-water-after-training-8497736/', author: 'Liliana Drew' },
  'FIT-007': { source: 'pexels', id: '6207519', page: '/photo/foam-textured-roller-prepared-for-massage-6207519/', author: 'Skylar Kang' },
  'CLO-008': { source: 'pexels', id: '8033007', page: '/photo/man-in-gray-crew-neck-long-sleeve-shirt-8033007/', author: 'MART PRODUCTION' },
  'CLO-009': { source: 'pexels', id: '7406675', page: '/photo/person-wearing-winter-clothing-7406675/', author: 'Darina Belonogova' },
  'OUT-001': { source: 'unsplash', photo: 'photo-1613645540553-d98859ffeec5', id: 'l4VPAybei94', author: 'Jeffrey Brandjes' },
  'OUT-003': { source: 'unsplash', photo: 'photo-1558477280-1bfed08ea5db', id: 'hcti0k5E2Iw', author: 'Felix M. Dorn' },
  'OUT-004': { source: 'unsplash', photo: 'photo-1517457773273-412ec74a18cd', id: '9uISZprJdXU', author: 'HEAD Accessories' },
  'OUT-006': { source: 'unsplash', photo: 'photo-1676337167337-a7140e84df68', id: 'VLFii5LPKKw', author: 'Newpowa' },
  'OUT-007': { source: 'unsplash', photo: 'photo-1510312305653-8ed496efae75', id: 'ebnlHkqfUHY', author: 'Kevin Ianeselli' },
  'OUT-008': { source: 'unsplash', photo: 'photo-1444012104069-996724bf4a0a', id: 'eqvj5r8nbH8', author: 'andrew welch' },
  'OUT-009': { source: 'unsplash', photo: 'photo-1785224926975-ddec4e9119a5', id: 'w_7z7HyGUbM', author: 'Adhitya Sibikumar' },
  'OUT-011': { source: 'unsplash', photo: 'photo-1778248842805-54e75d813b49', id: '1vnnSDYeGd8', author: 'Jimmy Liu' },
  'OUT-012': { source: 'unsplash', photo: 'photo-1773179656433-9b43c389f0c0', id: 'kEQ4X3pI8HU', author: 'Howard Walsh' },
  'KIT-001': { source: 'unsplash', photo: 'photo-1777500301273-b73640dc490e', id: 'j1CBL_jY3uY', author: 'Milos Lopusina' },
  'KIT-002': { source: 'unsplash', photo: 'photo-1590422749897-47036da0b0ff', id: 'u_jt9A7FADk', author: 'Diana Light' },
  'KIT-003': { source: 'unsplash', photo: 'photo-1759259639356-6eee63241869', id: 'WCmMU38zg1c', author: 'Nadia Valko' },
  'KIT-004': { source: 'unsplash', photo: 'photo-1496282808562-d01e97fac01c', id: 'vrgJNOSj4Eo', author: 'Nathan Dumlao' },
  'KIT-005': { source: 'unsplash', photo: 'photo-1758221052634-33f352d1318b', id: 'a0v-gPTSopg', author: 'Marie G.' },
  'KIT-006': { source: 'unsplash', photo: 'photo-1637739699971-7d4d5194e75c', id: 'xV7y6lQ90FM', author: 'Anshu A' },
  'KIT-007': { source: 'unsplash', photo: 'photo-1566557087503-b839ce6e5aa0', id: 'Hc6MQLgCVtc', author: 'Souro Souvik' },
  'KIT-008': { source: 'unsplash', photo: 'photo-1559761340-1e6a341f0b51', id: 'mGlfn5uQH80', author: 'Battlecreek Coffee Roasters' },
  'KIT-009': { source: 'unsplash', photo: 'photo-1781747835478-a9c3bab5a670', id: 'FttWZx9-wCk', author: 'Syamsul Haj' },
  'KIT-010': { source: 'unsplash', photo: 'photo-1693038603562-bb6191269ecc', id: 'IfhrWuQnbXk', author: 'Kedibone Isaac Makhumisane' },
  'KIT-011': { source: 'unsplash', photo: 'photo-1693680502445-2406da5a72e1', id: 'K2iRgp3nTMw', author: 'Deeliver' },
  'KIT-012': { source: 'unsplash', photo: 'photo-1778070798261-0c887a3468e3', id: 'CTWpTXLneWQ', author: 'Joseph Van' },
  'ELE-001': { source: 'unsplash', photo: 'photo-1618366712010-f4ae9c647dcb', id: 'lUMj2Zv5HUE', author: 'Luke Peterson' },
  'ELE-002': { source: 'unsplash', photo: 'photo-1606220588913-b3aacb4d2f46', id: 'qt9_OfTaaeY', author: 'TheRegisti' },
  'ELE-003': { source: 'unsplash', photo: 'photo-1760708825913-65a50b3dc39b', id: '7JbgHNq4h4k', author: 'Andrey Matveev' },
  'ELE-004': { source: 'unsplash', photo: 'photo-1652198145075-b41c363792d3', id: 'Cpmh9L2cY5k', author: 'Kevin Charit' },
  'ELE-005': { source: 'unsplash', photo: 'photo-1702561667800-2c49b0182229', id: 'Zah7GC6mNKg', author: 'Oakywood' },
  'ELE-006': { source: 'unsplash', photo: 'photo-1579586337278-3befd40fd17a', id: '2wFoa040m8g', author: 'Simon Daoudi' },
  'ELE-007': { source: 'unsplash', photo: 'photo-1547052178-7f2c5a20c332', id: '-WB52caEpmI', author: 'Lynda Sanchez' },
  'ELE-008': { source: 'unsplash', photo: 'photo-1703332795377-65ccc6818232', id: 'Ny3tTr8nEuQ', author: 'Irina Rybcko' },
  'ELE-009': { source: 'unsplash', photo: 'photo-1725304382197-663ae3864750', id: '1A_MMH9w-Sc', author: 'Andrey Matveev' },
  'ELE-010': { source: 'unsplash', photo: 'photo-1760348213920-d2a90ed705fd', id: 'Gq8qdtRwwJs', author: 'Bedirhan Gül' },
  'ELE-011': { source: 'unsplash', photo: 'photo-1777259113729-9bda92fb8ce8', id: 'XNLdEeILUqw', author: 'Roy Wen' },
  'CLO-001': { source: 'unsplash', photo: 'photo-1560769629-975ec94e6a86', id: 'dwKiHoqqxk8', author: 'Irene Kredenets' },
  'CLO-002': { source: 'unsplash', photo: 'photo-1711466067057-d1bd10183924', id: 'Rk62VPlcZqw', author: 'Deon Collison' },
  'CLO-003': { source: 'unsplash', photo: 'photo-1678872844677-d650b788709b', id: 'KL8EGoKDNcQ', author: 'Alexander London' },
  'CLO-004': { source: 'unsplash', photo: 'photo-1685122089837-9eda7396bf86', id: 'tAc1Ylnsnx8', author: 'Anna Stampfli' },
  'CLO-005': { source: 'unsplash', photo: 'photo-1567955465163-c355df3b74bf', id: 'uhaYQSVCjo0', author: 'Andy Køgl' },
  'CLO-006': { source: 'unsplash', photo: 'photo-1788088133499-559410a9c3dc', id: 'zZd4Dx9dO90', author: 'Konrad Nowacki' },
  'CLO-007': { source: 'unsplash', photo: 'photo-1764773966260-70c54fb7e429', id: '5coVrjfhxL0', author: 'Hanna Lazar' },
  'CLO-010': { source: 'unsplash', photo: 'photo-1602293589930-45aad59ba3ab', id: 'EtOMMg1nSR8', author: 'Jason Leung' },
  'CLO-011': { source: 'unsplash', photo: 'photo-1548652035-16d4cacff1e6', id: '6-ocuQ6XgJc', author: 'Wild Eucalypt' },
  'CLO-012': { source: 'unsplash', photo: 'photo-1641399050826-9616c90427bb', id: 'RFGrTK9oE3s', author: 'The Happy Toe' },
  'HOM-001': { source: 'unsplash', photo: 'photo-1773747608435-0fa80d11a32f', id: '4XlKcKpmjwU', author: 'Yuliia Pakhomova' },
  'HOM-002': { source: 'unsplash', photo: 'photo-1734553529922-bc020a21643b', id: 'WB7wXI8S0SE', author: 'Artur Ament' },
  'HOM-004': { source: 'unsplash', photo: 'photo-1519219788971-8d9797e0928e', id: '3A4XZUopCJA', author: 'Andrej Lišakov' },
  'HOM-005': { source: 'unsplash', photo: 'photo-1539208175673-6b9149754096', id: 'un5DGskIJuE', author: 'Jon Tyson' },
  'HOM-006': { source: 'unsplash', photo: 'photo-1600414428640-f78a67c2aa3b', id: '9W6BgX5hTvI', author: 'the blowup' },
  'HOM-007': { source: 'unsplash', photo: 'photo-1768471569643-717e823b5f9a', id: 'tqIaIls1eJY', author: 'zeliang xiao' },
  'HOM-008': { source: 'unsplash', photo: 'photo-1653990480360-31a12ce9723e', id: 'uhJgh4FHi6I', author: 'Onur Binay' },
  'HOM-011': { source: 'unsplash', photo: 'photo-1612293905607-b003de9e54fb', id: 'OAW0OCLn52I', author: 'No Revisions' },
  'HOM-012': { source: 'unsplash', photo: 'photo-1563861826100-9cb868fdbe1c', id: 'L0xOtAnv94Y', author: 'Ocean Ng' },
  'FIT-001': { source: 'unsplash', photo: 'photo-1625708458528-802ec79b1ed8', id: '6gLya_-tnP8', author: 'quokkabottles' },
  'FIT-002': { source: 'unsplash', photo: 'photo-1642539088032-41a1fb000bc5', id: 'aVuX_kXlJGo', author: 'Eastman Childs' },
  'FIT-003': { source: 'unsplash', photo: 'photo-1763004871583-4183d64096b1', id: 'YmaOkRjoBVc', author: 'Tuaans' },
  'FIT-004': { source: 'unsplash', photo: 'photo-1725289767222-3444016c70ce', id: 'SArGwhwGTI0', author: 'Kedibone Isaac Makhumisane' },
  'FIT-005': { source: 'unsplash', photo: 'photo-1776710669928-e49471c63af5', id: 'ZcleeG3CQrw', author: 'Gilson Gomes' },
  'FIT-008': { source: 'unsplash', photo: 'photo-1516876345887-6dd74f80787a', id: 'mPjPZmEfohI', author: 'Stoica Ionela' },
  'FIT-009': { source: 'unsplash', photo: 'photo-1448582649076-3981753123b5', id: '9XiN0r2NWSM', author: 'Erol Ahmed' },
  'FIT-011': { source: 'unsplash', photo: 'photo-1754839004013-0276d56bc0e7', id: 'xTZV2fpE6wk', author: 'Brunxs' },
}

/** One representative product photo per category, for the start page. */
export const categoryCover: Record<string, string> = {
  'Camping & Outdoors': 'OUT-012', // not OUT-007: that one is the home page hero
  'Kitchen & Drinkware': 'KIT-005',
  Electronics: 'ELE-001',
  Clothing: 'CLO-005',
  Home: 'HOM-002',
  Fitness: 'FIT-003',
}

/** Image URL for a given display width (both CDNs resize and crop on the fly). */
export function photoUrl(photo: ProductPhoto, width: number, height = Math.round(width * 0.75)): string {
  return photo.source === 'unsplash'
    ? `https://images.unsplash.com/${photo.photo}?w=${width}&h=${height}&fit=crop&auto=format&q=70`
    : `https://images.pexels.com/photos/${photo.id}/pexels-photo-${photo.id}.jpeg?auto=compress&cs=tinysrgb&w=${width}&h=${height}&fit=crop`
}

export const photoPageUrl = (photo: ProductPhoto): string =>
  photo.source === 'unsplash' ? `https://unsplash.com/photos/${photo.id}` : `https://www.pexels.com${photo.page}`
