/**
 * Utility functions for formatting, avatars, URL parameters and pagination
 * Uses clean CSS classes and design tokens with zero hardcoded colors.
 */

function formatCurrency(value) {
    if (value === null || value === undefined) return '-';
    if (value === 0) return '€0';
    if (value >= 1000000000) {
        return '€' + (value / 1000000000).toFixed(2) + 'B';
    }
    if (value >= 1000000) {
        return '€' + (value / 1000000).toFixed(1) + 'M';
    }
    if (value >= 1000) {
        return '€' + (value / 1000).toFixed(0) + 'K';
    }
    return '€' + Math.round(value).toLocaleString();
}

function formatNumber(value, decimals = 0) {
    if (value === null || value === undefined) return '-';
    return Number(value).toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

function formatPercent(value, showSign = true) {
    if (value === null || value === undefined) return '-';
    const num = Number(value);
    const formatted = num.toFixed(1) + '%';
    if (showSign && num > 0) return '+' + formatted;
    return formatted;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function debounce(fn, ms = 250) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), ms);
    };
}

function getPositionCategory(pos) {
    if (!pos) return 'fwd';
    const p = pos.toUpperCase();
    if (p === 'GK') return 'gk';
    if (['CB', 'FB', 'LB', 'RB', 'DEF'].includes(p)) return 'def';
    if (['DM', 'CM', 'AM', 'LM', 'RM', 'MID'].includes(p)) return 'mid';
    return 'fwd'; // ST, CF, LW, RW, W, ATT
}

function getPositionBadgeClass(pos) {
    const cat = getPositionCategory(pos);
    return `badge badge-pos-${cat}`;
}

function getPositionLabel(pos) {
    const labels = {
        'GK': 'Goalkeeper',
        'CB': 'Centre-Back',
        'FB': 'Full-Back',
        'LB': 'Left-Back',
        'RB': 'Right-Back',
        'DM': 'Defensive Midfield',
        'CM': 'Central Midfield',
        'AM': 'Attacking Midfield',
        'LM': 'Left Midfield',
        'RM': 'Right Midfield',
        'W': 'Winger',
        'LW': 'Left Winger',
        'RW': 'Right Winger',
        'ST': 'Striker',
        'CF': 'Center Forward'
    };
    return labels[pos] || pos || 'Unknown';
}

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

const TOP_PLAYER_PHOTOS = {
    "Erling Haaland": "https://img.a.transfermarkt.technology/portrait/big/418560-1709108116.png?lm=1",
    "Lamine Yamal": "https://img.a.transfermarkt.technology/portrait/big/937958-1773173768.jpg?lm=1",
    "Kylian Mbappé": "https://img.a.transfermarkt.technology/portrait/big/342229-1682683695.jpg?lm=1",
    "Michael Olise": "https://img.a.transfermarkt.technology/portrait/big/566723-1762944477.jpg?lm=1",
    "Pedri": "https://img.a.transfermarkt.technology/portrait/big/683840-1744278342.jpg?lm=1",
    "Vinicius Junior": "https://img.a.transfermarkt.technology/portrait/big/371998-1761575144.jpg?lm=1",
    "Vitinha": "https://img.a.transfermarkt.technology/portrait/big/487469-1749415169.jpg?lm=1",
    "Khvicha Kvaratskhelia": "https://img.a.transfermarkt.technology/portrait/big/502670-1777411223.jpg?lm=1",
    "João Neves": "https://img.a.transfermarkt.technology/portrait/big/670681-1701295511.jpg?lm=1",
    "Jude Bellingham": "https://img.a.transfermarkt.technology/portrait/big/581678-1748102891.jpg?lm=1",
    "Declan Rice": "https://img.a.transfermarkt.technology/portrait/big/357662-1687962936.jpg?lm=1",
    "Désiré Doué": "https://img.a.transfermarkt.technology/portrait/big/914562-1667317075.jpg?lm=1",
    "Bukayo Saka": "https://img.a.transfermarkt.technology/portrait/big/433177-1684155052.jpg?lm=1",
    "Ousmane Dembélé": "https://img.a.transfermarkt.technology/portrait/big/288230-1684148641.jpg?lm=1",
    "Dominik Szoboszlai": "https://img.a.transfermarkt.technology/portrait/big/451276-1758715234.jpg?lm=1",
    "William Saliba": "https://img.a.transfermarkt.technology/portrait/big/495666-1718697201.jpg?lm=1",
    "Cole Palmer": "https://img.a.transfermarkt.technology/portrait/big/568177-1712320986.jpg?lm=1",
    "Julián Alvarez": "https://img.a.transfermarkt.technology/portrait/big/576024-1684920938.jpg?lm=1",
    "Jamal Musiala": "https://img.a.transfermarkt.technology/portrait/big/580195-1781163507.jpg?lm=1",
    "Fermín López": "https://img.a.transfermarkt.technology/portrait/big/636703-1698086824.jpg?lm=1",
    "Moisés Caicedo": "https://img.a.transfermarkt.technology/portrait/big/687626-1660729724.jpg?lm=1",
    "Florian Wirtz": "https://img.a.transfermarkt.technology/portrait/big/598577-1781163178.jpg?lm=1",
    "Federico Valverde": "https://img.a.transfermarkt.technology/portrait/big/369081-1731018042.jpg?lm=1",
    "Morgan Rogers": "https://img.a.transfermarkt.technology/portrait/big/503743-1706786450.jpg?lm=1",
    "Rayan Cherki": "https://img.a.transfermarkt.technology/portrait/big/607223-1773302431.jpg?lm=1",
    "Enzo Fernández": "https://img.a.transfermarkt.technology/portrait/big/648195-1669894717.jpg?lm=1",
    "Aleksandar Pavlovic": "https://img.a.transfermarkt.technology/portrait/big/792380-1727098078.jpg?lm=1",
    "Arda Güler": "https://img.a.transfermarkt.technology/portrait/big/861410-1699472585.jpg?lm=1",
    "Yan Diomande": "https://img.a.transfermarkt.technology/portrait/big/1390649-1759779499.jpg?lm=1",
    "Lautaro Martínez": "https://img.a.transfermarkt.technology/portrait/big/406625-1695024988.jpg?lm=1",
    "Alexander Isak": "https://img.a.transfermarkt.technology/portrait/big/349066-1680791339.jpg?lm=1",
    "Sandro Tonali": "https://img.a.transfermarkt.technology/portrait/big/397033-1688389270.jpg?lm=1",
    "Achraf Hakimi": "https://img.a.transfermarkt.technology/portrait/big/398073-1672304327.jpg?lm=1",
    "Ryan Gravenberch": "https://img.a.transfermarkt.technology/portrait/big/478573-1718097194.jpg?lm=1",
    "Nuno Mendes": "https://img.a.transfermarkt.technology/portrait/big/616341-1749417164.jpg?lm=1",
    "João Pedro": "https://img.a.transfermarkt.technology/portrait/big/626724-1724792744.jpg?lm=1",
    "Willian Pacho": "https://img.a.transfermarkt.technology/portrait/big/661171-1696508666.jpg?lm=1",
    "Warren Zaïre-Emery": "https://img.a.transfermarkt.technology/portrait/big/810092-1777411744.jpg?lm=1",
    "Nico Paz": "https://img.a.transfermarkt.technology/portrait/big/948294-1699472504.jpg?lm=1",
    "Pau Cubarsí": "https://img.a.transfermarkt.technology/portrait/big/962110-1712779232.jpg?lm=1",
    "Estêvão": "https://img.a.transfermarkt.technology/portrait/big/1056993-1766148652.jpg?lm=1",
    "Antoine Semenyo": "https://img.a.transfermarkt.technology/portrait/big/583255-1737452028.jpg?lm=1",
    "Hugo Ekitiké": "https://img.a.transfermarkt.technology/portrait/big/709726-1758714741.jpg?lm=1",
    "Gabriel": "https://img.a.transfermarkt.technology/portrait/big/435338-1684162833.jpg?lm=1",
    "Jérémy Doku": "https://img.a.transfermarkt.technology/portrait/big/486049-1743670159.jpg?lm=1",
    "Elliot Anderson": "https://img.a.transfermarkt.technology/portrait/big/567576-1696453772.jpg?lm=1",
    "Kenan Yıldız": "https://img.a.transfermarkt.technology/portrait/big/845654-1759822280.jpg?lm=1",
    "Bryan Mbeumo": "https://img.a.transfermarkt.technology/portrait/big/413039-1769532496.jpg?lm=1",
    "Martín Zubimendi": "https://img.a.transfermarkt.technology/portrait/big/423440-1684149419.jpg?lm=1",
    "Matheus Cunha": "https://img.a.transfermarkt.technology/portrait/big/517894-1780390711.jpg?lm=1",
    "Benjamin Sesko": "https://img.a.transfermarkt.technology/portrait/big/627442-1779803478.jpg?lm=1",
    "Dayot Upamecano": "https://img.a.transfermarkt.technology/portrait/big/344695-1701245272.jpg?lm=1",
    "Phil Foden": "https://img.a.transfermarkt.technology/portrait/big/406635-1668524492.jpg?lm=1",
    "Raphinha": "https://img.a.transfermarkt.technology/portrait/big/411295-1729754479.png?lm=1",
    "Aurélien Tchouaméni": "https://img.a.transfermarkt.technology/portrait/big/413112-1668500754.jpg?lm=1",
    "Jurriën Timber": "https://img.a.transfermarkt.technology/portrait/big/420243-1702413077.jpg?lm=1",
    "Morgan Gibbs-White": "https://img.a.transfermarkt.technology/portrait/big/429014-1687975822.jpg?lm=1",
    "Josko Gvardiol": "https://img.a.transfermarkt.technology/portrait/big/475959-1713391602.jpg?lm=1",
    "Bruno Guimarães": "https://img.a.transfermarkt.technology/portrait/big/520624-1780929894.jpg?lm=1",
    "Alexis Mac Allister": "https://img.a.transfermarkt.technology/portrait/big/534033-1669835342.jpg?lm=1",
    "Bradley Barcola": "https://img.a.transfermarkt.technology/portrait/big/708265-1780989250.jpg?lm=1",
    "Nico O'Reilly": "https://img.a.transfermarkt.technology/portrait/big/743413-1751367149.jpg?lm=1",
    "Adam Wharton": "https://img.a.transfermarkt.technology/portrait/big/744149-1716297290.jpg?lm=1",
    "Kobbie Mainoo": "https://img.a.transfermarkt.technology/portrait/big/820374-1719349758.jpg?lm=1",
    "Junior Kroupi": "https://img.a.transfermarkt.technology/portrait/big/955357-1727784350.jpg?lm=1",
    "Marc Guéhi": "https://img.a.transfermarkt.technology/portrait/big/392757-1683030598.jpg?lm=1",
    "Luis Díaz": "https://img.a.transfermarkt.technology/portrait/big/480692-1757938077.jpg?lm=1",
    "Alessandro Bastoni": "https://img.a.transfermarkt.technology/portrait/big/315853-1742497518.jpg?lm=1",
    "Martin Ødegaard": "https://img.a.transfermarkt.technology/portrait/big/316264-1782847069.jpg?lm=1",
    "Viktor Gyökeres": "https://img.a.transfermarkt.technology/portrait/big/325443-1737581896.jpg?lm=1",
    "Anthony Gordon": "https://img.a.transfermarkt.technology/portrait/big/503733-1761080304.jpg?lm=1",
    "Igor Thiago": "https://img.a.transfermarkt.technology/portrait/big/739443-1770372295.jpg?lm=1",
    "Eberechi Eze": "https://img.a.transfermarkt.technology/portrait/big/479999-1761083931.jpg?lm=1",
    "Harry Kane": "https://img.a.transfermarkt.technology/portrait/big/132098-1700211169.jpg?lm=1",
    "Dani Olmo": "https://img.a.transfermarkt.technology/portrait/big/293385-1780663091.jpg?lm=1",
    "Trent Alexander-Arnold": "https://img.a.transfermarkt.technology/portrait/big/314353-1701680958.jpg?lm=1",
    "Jules Koundé": "https://img.a.transfermarkt.technology/portrait/big/411975-1702502639.jpg?lm=1",
    "Cody Gakpo": "https://img.a.transfermarkt.technology/portrait/big/434675-1682690965.jpg?lm=1",
    "Reece James": "https://img.a.transfermarkt.technology/portrait/big/472423-1683900849.jpg?lm=1",
    "Pedro Neto": "https://img.a.transfermarkt.technology/portrait/big/487465-1763106447.jpg?lm=1",
    "Dean Huijsen": "https://img.a.transfermarkt.technology/portrait/big/890290-1750251451.jpg?lm=1",
    "Luka Vuskovic": "https://img.a.transfermarkt.technology/portrait/big/892160-1758187820.jpg?lm=1",
    "Rayan": "https://img.a.transfermarkt.technology/portrait/big/1012564-1780390891.jpg?lm=1",
    "Lennart Karl": "https://img.a.transfermarkt.technology/portrait/big/1075147-1759417800.jpg?lm=1",
    "Rasmus Højlund": "https://img.a.transfermarkt.technology/portrait/big/610442-1757931324.jpg?lm=1",
    "Rúben Dias": "https://img.a.transfermarkt.technology/portrait/big/258004-1684921271.jpg?lm=1",
    "Kai Havertz": "https://img.a.transfermarkt.technology/portrait/big/309400-1782889722.jpg?lm=1",
    "Nico Schlotterbeck": "https://img.a.transfermarkt.technology/portrait/big/388198-1709560457.jpg?lm=1",
    "Riccardo Calafiori": "https://img.a.transfermarkt.technology/portrait/big/502821-1727382174.jpg?lm=1",
    "Mason Greenwood": "https://img.a.transfermarkt.technology/portrait/big/532826-1693987766.jpg?lm=1",
    "Iliman Ndiaye": "https://img.a.transfermarkt.technology/portrait/big/623570-1765811829.jpg?lm=1",
    "Pablo Barrios": "https://img.a.transfermarkt.technology/portrait/big/775605-1699431384.jpg?lm=1",
    "Carlos Baleba": "https://img.a.transfermarkt.technology/portrait/big/973085-1666690662.jpg?lm=1",
    "Jérémy Jacquet": "https://img.a.transfermarkt.technology/portrait/big/1004301-1714503850.jpg?lm=1",
    "Nick Woltemade": "https://img.a.transfermarkt.technology/portrait/big/455661-1779983237.jpg?lm=1",
    "Federico Dimarco": "https://img.a.transfermarkt.technology/portrait/big/198116-1725531769.jpg?lm=1",
    "Nicolò Barella": "https://img.a.transfermarkt.technology/portrait/big/255942-1725531625.jpg?lm=1",
    "Marc Cucurella": "https://img.a.transfermarkt.technology/portrait/big/284857-1765185117.jpg?lm=1",
    "Marcus Thuram": "https://img.a.transfermarkt.technology/portrait/big/318528-1746041509.jpg?lm=1",
    "Rafael Leão": "https://img.a.transfermarkt.technology/portrait/big/357164-1730126553.jpg?lm=1",
    "Rodri": "https://img.a.transfermarkt.technology/portrait/big/357565-1682587890.jpg?lm=1",
    "Ferran Torres": "https://img.a.transfermarkt.technology/portrait/big/398184-1779789996.jpg?lm=1",
    "Felix Nmecha": "https://img.a.transfermarkt.technology/portrait/big/406640-1709560961.jpg?lm=1",
    "Maxence Lacroix": "https://img.a.transfermarkt.technology/portrait/big/434224-1657202248.jpg?lm=1",
    "Yann Bisseck": "https://img.a.transfermarkt.technology/portrait/big/441986-1742497863.jpg?lm=1",
    "Omar Marmoush": "https://img.a.transfermarkt.technology/portrait/big/445939-1747656490.jpg?lm=1",
    "Tijjani Reijnders": "https://img.a.transfermarkt.technology/portrait/big/460939-1773302677.jpg?lm=1",
    "Micky van de Ven": "https://img.a.transfermarkt.technology/portrait/big/557459-1744313600.jpg?lm=1",
    "Matheus Nunes": "https://img.a.transfermarkt.technology/portrait/big/601883-1761076097.jpg?lm=1",
    "Levi Colwill": "https://img.a.transfermarkt.technology/portrait/big/614258-1694614507.jpg?lm=1",
    "Castello Lukeba": "https://img.a.transfermarkt.technology/portrait/big/618472-1713897532.jpg?lm=1",
    "Manu Koné": "https://img.a.transfermarkt.technology/portrait/big/624690-1757931309.jpg?lm=1",
    "Alejandro Balde": "https://img.a.transfermarkt.technology/portrait/big/636688-1662836200.jpg?lm=1",
    "Eduardo Camavinga": "https://img.a.transfermarkt.technology/portrait/big/640428-1668500874.jpg?lm=1",
    "Maghnes Akliouche": "https://img.a.transfermarkt.technology/portrait/big/745200-1717406573.jpg?lm=1",
    "Abdukodir Khusanov": "https://img.a.transfermarkt.technology/portrait/big/763079-1740493347.jpg?lm=1",
    "Álvaro Carreras": "https://img.a.transfermarkt.technology/portrait/big/811778-1737497415.jpg?lm=1",
    "Alex Scott": "https://img.a.transfermarkt.technology/portrait/big/855256-1656922605.jpg?lm=1",
    "Leny Yoro": "https://img.a.transfermarkt.technology/portrait/big/923831-1747857948.jpg?lm=1",
    "Johan Manzambi": "https://img.a.transfermarkt.technology/portrait/big/927353-1753954939.jpg?lm=1",
    "Murillo": "https://img.a.transfermarkt.technology/portrait/big/1005649-1709159139.jpg?lm=1",
    "Ayyoub Bouaddi": "https://img.a.transfermarkt.technology/portrait/big/1097139-1741119960.jpg?lm=1",
    "Noni Madueke": "https://img.a.transfermarkt.technology/portrait/big/503987-1683102348.jpg?lm=1",
    "Mohammed Kudus": "https://img.a.transfermarkt.technology/portrait/big/543499-1668429218.jpg?lm=1",
    "Piero Hincapié": "https://img.a.transfermarkt.technology/portrait/big/659813-1727377918.jpg?lm=1",
    "Alberto Moleiro": "https://img.a.transfermarkt.technology/portrait/big/733576-1737365948.jpg?lm=1",
    "Mateus Fernandes": "https://img.a.transfermarkt.technology/portrait/big/880245-1727786403.jpg?lm=1",
    "Cristian Romero": "https://img.a.transfermarkt.technology/portrait/big/355915-1665609429.jpg?lm=1",
    "Ibrahima Konaté": "https://img.a.transfermarkt.technology/portrait/big/357119-1669190550.jpg?lm=1",
    "Rodrygo": "https://img.a.transfermarkt.technology/portrait/big/412363-1763041611.jpg?lm=1",
    "Angelo Stiller": "https://img.a.transfermarkt.technology/portrait/big/443710-1753308094.jpg?lm=1",
    "Amadou Onana": "https://img.a.transfermarkt.technology/portrait/big/485706-1718697649.jpg?lm=1",
    "Tino Livramento": "https://img.a.transfermarkt.technology/portrait/big/503981-1699383321.jpg?lm=1",
    "James Garner": "https://img.a.transfermarkt.technology/portrait/big/505219-1662067244.jpg?lm=1",
    "Amad Diallo": "https://img.a.transfermarkt.technology/portrait/big/536835-1747857754.jpg?lm=1",
    "Jan Paul van Hecke": "https://img.a.transfermarkt.technology/portrait/big/576314-1742501220.jpg?lm=1",
    "Éderson": "https://img.a.transfermarkt.technology/portrait/big/607854-1646648856.jpg?lm=1",
    "Gabriel Martinelli": "https://img.a.transfermarkt.technology/portrait/big/655488-1682689091.jpg?lm=1",
    "Can Uzun": "https://img.a.transfermarkt.technology/portrait/big/816585-1724772468.jpg?lm=1",
    "Myles Lewis-Skelly": "https://img.a.transfermarkt.technology/portrait/big/890721-1758053582.jpg?lm=1",
    "Ibrahim Maza": "https://img.a.transfermarkt.technology/portrait/big/905011-1758702817.jpg?lm=1",
    "Pio Esposito": "https://img.a.transfermarkt.technology/portrait/big/930781-1757605256.jpg?lm=1",
    "Yankuba Minteh": "https://img.a.transfermarkt.technology/portrait/big/1012534-1694774813.jpg?lm=1",
    "Franco Mastantuono": "https://img.a.transfermarkt.technology/portrait/big/1057316-1755702696.jpg?lm=1",
    "Said El Mala": "https://img.a.transfermarkt.technology/portrait/big/1168219-1761497362.jpg?lm=1",
    "Gianluigi Donnarumma": "https://img.a.transfermarkt.technology/portrait/big/315858-1761076746.jpg?lm=1",
    "Donyell Malen": "https://img.a.transfermarkt.technology/portrait/big/326029-1711746104.jpg?lm=1",
    "Malick Thiaw": "https://img.a.transfermarkt.technology/portrait/big/521964-1682063635.jpg?lm=1",
    "Joan García": "https://img.a.transfermarkt.technology/portrait/big/561613-1747386081.jpg?lm=1",
    "Jarell Quansah": "https://img.a.transfermarkt.technology/portrait/big/632349-1758704191.jpg?lm=1",
    "Gregor Kobel": "https://img.a.transfermarkt.technology/portrait/big/257814-1709559904.jpg?lm=1",
    "Christian Pulisic": "https://img.a.transfermarkt.technology/portrait/big/315779-1691696699.jpg?lm=1",
    "Scott McTominay": "https://img.a.transfermarkt.technology/portrait/big/315969-1780932470.jpg?lm=1",
    "Christoph Baumgartner": "https://img.a.transfermarkt.technology/portrait/big/324278-1716315718.jpg?lm=1",
    "Trevoh Chalobah": "https://img.a.transfermarkt.technology/portrait/big/346314-1773301391.jpg?lm=1",
    "Boubacar Kamara": "https://img.a.transfermarkt.technology/portrait/big/394327-1736160460.jpg?lm=1",
    "Ademola Lookman": "https://img.a.transfermarkt.technology/portrait/big/406040-1769763751.jpg?lm=1",
    "Ismaïla Sarr": "https://img.a.transfermarkt.technology/portrait/big/410225-1765811669.jpg?lm=1",
    "Ezri Konsa": "https://img.a.transfermarkt.technology/portrait/big/413403-1700651779.jpg?lm=1",
    "Alphonso Davies": "https://img.a.transfermarkt.technology/portrait/big/424204-1711745534.jpg?lm=1",
    "Jørgen Strand Larsen": "https://img.a.transfermarkt.technology/portrait/big/429983-1743541067.jpg?lm=1",
    "Eric García": "https://img.a.transfermarkt.technology/portrait/big/466794-1693604801.jpg?lm=1",
    "Nico González": "https://img.a.transfermarkt.technology/portrait/big/466805-1743669968.jpg?lm=1",
    "Lisandro Martínez": "https://img.a.transfermarkt.technology/portrait/big/480762-1680681507.jpg?lm=1",
    "Josip Stanisic": "https://img.a.transfermarkt.technology/portrait/big/483046-1716966862.jpg?lm=1",
    "Pape Gueye": "https://img.a.transfermarkt.technology/portrait/big/485963-1768814767.jpg?lm=1",
    "Karim Adeyemi": "https://img.a.transfermarkt.technology/portrait/big/496094-1712859708.jpg?lm=1",
    "Folarin Balogun": "https://img.a.transfermarkt.technology/portrait/big/503770-1672838317.jpg?lm=1",
    "Jamie Leweling": "https://img.a.transfermarkt.technology/portrait/big/518505-1691999306.jpg?lm=1",
    "Bart Verbruggen": "https://img.a.transfermarkt.technology/portrait/big/565093-1716990260.jpg?lm=1",
    "Xavi Simons": "https://img.a.transfermarkt.technology/portrait/big/566931-1729778226.jpg?lm=1",
    "Strahinja Pavlović": "https://img.a.transfermarkt.technology/portrait/big/574671-1757664768.jpg?lm=1",
    "Rayan Aït-Nouri": "https://img.a.transfermarkt.technology/portrait/big/578391-1761076429.jpg?lm=1",
    "Maximilian Beier": "https://img.a.transfermarkt.technology/portrait/big/578392-1733829348.jpg?lm=1",
    "Antony": "https://img.a.transfermarkt.technology/portrait/big/602105-1758783018.jpg?lm=1",
    "Kaishu Sano": "https://img.a.transfermarkt.technology/portrait/big/643574-1752587688.jpg?lm=1",
    "Jarrad Branthwaite": "https://img.a.transfermarkt.technology/portrait/big/661053-1687975679.jpg?lm=1",
    "Petar Sučić": "https://img.a.transfermarkt.technology/portrait/big/668207-1757603291.jpg?lm=1",
    "Lewis Hall": "https://img.a.transfermarkt.technology/portrait/big/670858-1699385942.jpg?lm=1",
    "Nathaniel Brown": "https://img.a.transfermarkt.technology/portrait/big/691892-1724772335.jpg?lm=1",
    "Nico Williams": "https://img.a.transfermarkt.technology/portrait/big/709187-1709676169.png?lm=1",
    "Abde Ezzalzouli": "https://img.a.transfermarkt.technology/portrait/big/724520-1758782814.jpg?lm=1",
    "João Gomes": "https://img.a.transfermarkt.technology/portrait/big/735570-1675092223.jpg?lm=1",
    "Giuliano Simeone": "https://img.a.transfermarkt.technology/portrait/big/742201-1741120599.jpg?lm=1",
    "Andrey Santos": "https://img.a.transfermarkt.technology/portrait/big/743600-1732576153.png?lm=1",
    "Jobe Bellingham": "https://img.a.transfermarkt.technology/portrait/big/796297-1766483351.jpg?lm=1",
    "Mamadou Sangaré": "https://img.a.transfermarkt.technology/portrait/big/808348-1726049980.jpg?lm=1",
    "Tom Bischof": "https://img.a.transfermarkt.technology/portrait/big/822959-1758269709.jpg?lm=1",
    "Michael Kayode": "https://img.a.transfermarkt.technology/portrait/big/823486-1725531169.jpg?lm=1",
    "Valentín Barco": "https://img.a.transfermarkt.technology/portrait/big/849410-1750770955.png?lm=1",
    "Senny Mayulu": "https://img.a.transfermarkt.technology/portrait/big/903693-1716562599.jpg?lm=1",
    "Jorrel Hato": "https://img.a.transfermarkt.technology/portrait/big/904802-1701361717.jpg?lm=1",
    "Lamine Camara": "https://img.a.transfermarkt.technology/portrait/big/918969-1726834088.jpg?lm=1",
    "Wesley": "https://img.a.transfermarkt.technology/portrait/big/964580-1743167536.jpg?lm=1",
    "Endrick": "https://img.a.transfermarkt.technology/portrait/big/971570-1782847902.jpg?lm=1",
    "Bazoumana Touré": "https://img.a.transfermarkt.technology/portrait/big/1067904-1755092124.jpg?lm=1",
    "Christian Kofane": "https://img.a.transfermarkt.technology/portrait/big/1364454-1758702715.jpg?lm=1",
    "Marcus Rashford": "https://img.a.transfermarkt.technology/portrait/big/258923-1674473054.jpg?lm=1",
    "Álex Baena": "https://img.a.transfermarkt.technology/portrait/big/548111-1761821030.jpg?lm=1",
    "Cristhian Mosquera": "https://img.a.transfermarkt.technology/portrait/big/646750-1749739359.jpg?lm=1",
    "Ilya Zabarnyi": "https://img.a.transfermarkt.technology/portrait/big/659089-1760065378.jpg?lm=1",
    "Nicolas Jackson": "https://img.a.transfermarkt.technology/portrait/big/776890-1757939139.jpg?lm=1",
    "Khéphren Thuram": "https://img.a.transfermarkt.technology/portrait/big/463618-1683889273.jpg?lm=1",
    "Giorgio Scalvini": "https://img.a.transfermarkt.technology/portrait/big/571604-1701860841.jpg?lm=1",
    "Joshua Kimmich": "https://img.a.transfermarkt.technology/portrait/big/161056-1700039639.jpg?lm=1",
    "Bruno Fernandes": "https://img.a.transfermarkt.technology/portrait/big/240306-1683882766.jpg?lm=1",
    "Brahim Díaz": "https://img.a.transfermarkt.technology/portrait/big/314678-1744193327.jpg?lm=1",
    "Frenkie de Jong": "https://img.a.transfermarkt.technology/portrait/big/326330-1746041680.jpg?lm=1",
    "Mile Svilar": "https://img.a.transfermarkt.technology/portrait/big/338670-1725532174.jpg?lm=1",
    "Dušan Vlahović": "https://img.a.transfermarkt.technology/portrait/big/357498-1683293071.jpg?lm=1",
    "Sven Botman": "https://img.a.transfermarkt.technology/portrait/big/361093-1683290679.jpg?lm=1",
    "Ferdi Kadıoğlu": "https://img.a.transfermarkt.technology/portrait/big/369316-1724792538.jpg?lm=1",
    "Evan Ndicka": "https://img.a.transfermarkt.technology/portrait/big/371149-1757605149.jpg?lm=1",
    "Dávid Hancko": "https://img.a.transfermarkt.technology/portrait/big/404418-1722415670.jpg?lm=1",
    "Jakub Kiwior": "https://img.a.transfermarkt.technology/portrait/big/425918-1683101307.jpg?lm=1",
    "Curtis Jones": "https://img.a.transfermarkt.technology/portrait/big/433188-1701681163.jpg?lm=1",
    "Kevin Schade": "https://img.a.transfermarkt.technology/portrait/big/473050-1700560328.jpg?lm=1",
    "Crysencio Summerville": "https://img.a.transfermarkt.technology/portrait/big/474701-1781510697.jpg?lm=1",
    "Bremer": "https://img.a.transfermarkt.technology/portrait/big/516716-1725531520.jpg?lm=1",
    "Fisnik Asllani": "https://img.a.transfermarkt.technology/portrait/big/524290-1755090506.jpg?lm=1",
    "Pedro Porro": "https://img.a.transfermarkt.technology/portrait/big/553875-1730812390.jpg?lm=1",
    "Edmond Tapsoba": "https://img.a.transfermarkt.technology/portrait/big/564545-1695368009.jpg?lm=1",
    "Malo Gusto": "https://img.a.transfermarkt.technology/portrait/big/620322-1752061866.jpg?lm=1",
    "Igor Paixão": "https://img.a.transfermarkt.technology/portrait/big/653610-1723200804.jpg?lm=1",
    "Yasin Ayari": "https://img.a.transfermarkt.technology/portrait/big/667287-1746438362.jpg?lm=1",
    "Máximo Perrone": "https://img.a.transfermarkt.technology/portrait/big/668547-1681246573.jpg?lm=1",
    "Matías Soulé": "https://img.a.transfermarkt.technology/portrait/big/668951-1725529266.jpg?lm=1",
    "Gerard Martín": "https://img.a.transfermarkt.technology/portrait/big/705395-1730119053.jpg?lm=1",
    "Evanilson": "https://img.a.transfermarkt.technology/portrait/big/711337-1737452098.jpg?lm=1",
    "Matias Fernandez-Pardo": "https://img.a.transfermarkt.technology/portrait/big/724129-1780057362.jpg?lm=1",
    "Noah Sadiki": "https://img.a.transfermarkt.technology/portrait/big/727089-1767005980.jpg?lm=1",
    "Savinho": "https://img.a.transfermarkt.technology/portrait/big/743591-1751367497.jpg?lm=1",
    "Marc Pubill": "https://img.a.transfermarkt.technology/portrait/big/844637-1779789749.jpg?lm=1",
    "Lucas Bergvall": "https://img.a.transfermarkt.technology/portrait/big/866246-1701861399.jpg?lm=1",
    "Archie Gray": "https://img.a.transfermarkt.technology/portrait/big/922693-1695108880.jpg?lm=1",
    "Finn Jeltsch": "https://img.a.transfermarkt.technology/portrait/big/924117-1753307360.jpg?lm=1",
    "Patrick Dorgu": "https://img.a.transfermarkt.technology/portrait/big/926952-1747857569.jpg?lm=1",
    "Joaquín Panichelli": "https://img.a.transfermarkt.technology/portrait/big/1064871-1727113388.jpg?lm=1",
    "Estéban Lepaul": "https://img.a.transfermarkt.technology/portrait/big/461607-1750956916.png?lm=1",
    "Kiernan Dewsbury-Hall": "https://img.a.transfermarkt.technology/portrait/big/475188-1774470020.jpg?lm=1",
    "Jeremie Frimpong": "https://img.a.transfermarkt.technology/portrait/big/484547-1689710682.jpg?lm=1",
    "Jacob Ramsey": "https://img.a.transfermarkt.technology/portrait/big/503749-1687975464.jpg?lm=1",
    "Bilal El Khannouss": "https://img.a.transfermarkt.technology/portrait/big/654982-1782376778.jpg?lm=1",
    "Milos Kerkez": "https://img.a.transfermarkt.technology/portrait/big/730861-1773172293.jpg?lm=1",
    "Dango Ouattara": "https://img.a.transfermarkt.technology/portrait/big/823231-1737452292.jpg?lm=1",
    "Ange-Yoan Bonny": "https://img.a.transfermarkt.technology/portrait/big/827734-1751380953.jpg?lm=1",
    "Habib Diarra": "https://img.a.transfermarkt.technology/portrait/big/876631-1765811931.jpg?lm=1",
    "Ethan Nwaneri": "https://img.a.transfermarkt.technology/portrait/big/890719-1730794927.jpg?lm=1",
    "Marco Palestra": "https://img.a.transfermarkt.technology/portrait/big/895937-1704902310.jpg?lm=1",
    "Konrad Laimer": "https://img.a.transfermarkt.technology/portrait/big/223967-1700659266.jpg?lm=1",
    "Harvey Barnes": "https://img.a.transfermarkt.technology/portrait/big/398065-1761079974.jpg?lm=1",
    "Deniz Undav": "https://img.a.transfermarkt.technology/portrait/big/339314-1691999036.jpg?lm=1",
    "Ollie Watkins": "https://img.a.transfermarkt.technology/portrait/big/324358-1708341279.jpg?lm=1",
    "Igor Jesus": "https://img.a.transfermarkt.technology/portrait/big/432164-1725325779.jpg?lm=1",
    "Brenden Aaronson": "https://img.a.transfermarkt.technology/portrait/big/393323-1691614083.jpg?lm=1",
    "Emiliano Buendía": "https://img.a.transfermarkt.technology/portrait/big/321247-1696604099.jpg?lm=1",
    "David Raya": "https://img.a.transfermarkt.technology/portrait/big/262749-1780663789.jpg?lm=1",
    "Robert Sánchez": "https://img.a.transfermarkt.technology/portrait/big/403151-1695028195.jpg?lm=1",
    "Nikola Milenković": "https://img.a.transfermarkt.technology/portrait/big/413507-1661166461.jpg?lm=1",
    "Weston McKennie": "https://img.a.transfermarkt.technology/portrait/big/332697-1754245044.jpg?lm=1",
    "Aleix García": "https://img.a.transfermarkt.technology/portrait/big/261504-1727378020.jpg?lm=1",
    "Anthony Elanga": "https://img.a.transfermarkt.technology/portrait/big/583189-1700739021.jpg?lm=1",
    "Pablo Fornals": "https://img.a.transfermarkt.technology/portrait/big/357885-1773344365.jpg?lm=1",
    "Jarrod Bowen": "https://img.a.transfermarkt.technology/portrait/big/314875-1662362005.jpg?lm=1",
    "Leandro Trossard": "https://img.a.transfermarkt.technology/portrait/big/144028-1702412939.jpg?lm=1",
    "Callum Hudson-Odoi": "https://img.a.transfermarkt.technology/portrait/big/392768-1659969850.png?lm=1",
    "Pierre Kalulu": "https://img.a.transfermarkt.technology/portrait/big/585949-1684854558.jpg?lm=1",
    "Matty Cash": "https://img.a.transfermarkt.technology/portrait/big/425334-1668091733.jpg?lm=1",
    "Jaidon Anthony": "https://img.a.transfermarkt.technology/portrait/big/684210-1637578473.jpg?lm=1",
    "John McGinn": "https://img.a.transfermarkt.technology/portrait/big/193116-1689172405.jpg?lm=1",
    "Romain Faivre": "https://img.a.transfermarkt.technology/portrait/big/555076-1672831296.jpg?lm=1",
    "Bafodé Diakité": "https://img.a.transfermarkt.technology/portrait/big/463605-1666691072.jpg?lm=1",
    "Mikel Jauregizar": "https://img.a.transfermarkt.technology/portrait/big/938729-1709675994.png?lm=1",
    "Pablo Sarabia": "https://img.a.transfermarkt.technology/portrait/big/74230-1762258624.jpg?lm=1",
    "Mike Tresor": "https://img.a.transfermarkt.technology/portrait/big/381963-1626766909.jpg?lm=1",
    "Raúl García": "https://img.a.transfermarkt.technology/portrait/big/631002-1614090749.jpg?lm=1",
    "Mathias Jensen": "https://img.a.transfermarkt.technology/portrait/big/319859-1684771732.jpg?lm=1",
    "Ryan Yates": "https://img.a.transfermarkt.technology/portrait/big/425902-1684239778.jpg?lm=1",
    "Adama Traoré": "https://img.a.transfermarkt.technology/portrait/big/204103-1736153427.jpg?lm=1",
    "Gorka Guruzeta": "https://img.a.transfermarkt.technology/portrait/big/340205-1709676375.png?lm=1",
    "Rubin Colwill": "https://img.a.transfermarkt.technology/portrait/big/626474-1621846379.jpg?lm=1",
    "Alfon González": "https://img.a.transfermarkt.technology/portrait/big/357628-1734950388.jpg?lm=1",
    "Simone Canestrelli": "https://img.a.transfermarkt.technology/portrait/big/358003-1753431201.jpg?lm=1",
    "Liam Cullen": "https://img.a.transfermarkt.technology/portrait/big/296978-1679675846.jpg?lm=1",
    "Hee-chan Hwang": "https://img.a.transfermarkt.technology/portrait/big/292246-1708341416.jpg?lm=1",
    "David Møller Wolfe": "https://img.a.transfermarkt.technology/portrait/big/661427-1753350331.jpg?lm=1",
    "Maximilian Eggestein": "https://img.a.transfermarkt.technology/portrait/big/190284-1723189965.jpg?lm=1",
    "Federico Baschirotto": "https://img.a.transfermarkt.technology/portrait/big/351955-1730126092.jpg?lm=1",
    "Mario Pašalić": "https://img.a.transfermarkt.technology/portrait/big/205938-1716240830.jpg?lm=1",
    "Ilaix Moriba": "https://img.a.transfermarkt.technology/portrait/big/617074-1758827372.jpg?lm=1",
    "Vincenzo Grifo": "https://img.a.transfermarkt.technology/portrait/big/185077-1753983973.jpg?lm=1",
    "Danny Ings": "https://img.a.transfermarkt.technology/portrait/big/134294-1674218597.jpg?lm=1",
    "Marash Kumbulla": "https://img.a.transfermarkt.technology/portrait/big/371371-1716969202.jpg?lm=1",
    "Nicolas Pépé": "https://img.a.transfermarkt.technology/portrait/big/343052-1758059244.jpg?lm=1",
    "Marcus Edwards": "https://img.a.transfermarkt.technology/portrait/big/314367-1653379978.jpg?lm=1",
    "Marc Roca": "https://img.a.transfermarkt.technology/portrait/big/336869-1773344159.jpg?lm=1",
    "Matthias Ginter": "https://img.a.transfermarkt.technology/portrait/big/124502-1753984264.jpg?lm=1",
    "Santiago Bueno": "https://img.a.transfermarkt.technology/portrait/big/438001-1738823992.jpg?lm=1",
    "Bryan Cristante": "https://img.a.transfermarkt.technology/portrait/big/199248-1724827920.jpg?lm=1",
    "Callum Wilson": "https://img.a.transfermarkt.technology/portrait/big/123682-1668090039.jpg?lm=1",
    "Javi Rueda": "https://img.a.transfermarkt.technology/portrait/big/652331-1773949798.jpg?lm=1",
    "Cameron Archer": "https://img.a.transfermarkt.technology/portrait/big/533662-1641461875.jpg?lm=1",
    "Yvan Neyou": "https://img.a.transfermarkt.technology/portrait/big/469669-1703762516.jpg?lm=1",
    "Hamza Choudhury": "https://img.a.transfermarkt.technology/portrait/big/341501-1741026895.jpg?lm=1",
    "Irvin Cardona": "https://img.a.transfermarkt.technology/portrait/big/342226-1723534120.jpg?lm=1",
    "Luke Woolfenden": "https://img.a.transfermarkt.technology/portrait/big/527425-1664180037.jpg?lm=1",
    "Carlos Vicente": "https://img.a.transfermarkt.technology/portrait/big/540536-1732115480.jpg?lm=1",
    "Josh Cullen": "https://img.a.transfermarkt.technology/portrait/big/242606-1774468976.jpg?lm=1",
    "Saúl Coco": "https://img.a.transfermarkt.technology/portrait/big/588426-1725531089.jpg?lm=1",
    "Borja Iglesias": "https://img.a.transfermarkt.technology/portrait/big/278359-1686661509.jpg?lm=1",
    "Kepa Arrizabalaga": "https://img.a.transfermarkt.technology/portrait/big/192279-1661855851.jpg?lm=1",
    "Ross Stewart": "https://img.a.transfermarkt.technology/portrait/big/447995-1645779367.jpg?lm=1",
    "Kalvin Phillips": "https://img.a.transfermarkt.technology/portrait/big/351749-1661978510.jpg?lm=1",
    "Axel Tuanzebe": "https://img.a.transfermarkt.technology/portrait/big/342046-1774470130.jpg?lm=1",
    "Marc Aguado": "https://img.a.transfermarkt.technology/portrait/big/531404-1709050897.jpg?lm=1",
    "Dejan Kulusevski": "https://img.a.transfermarkt.technology/portrait/big/431755-1684943454.jpg?lm=1",
    "Alexander Nübel": "https://img.a.transfermarkt.technology/portrait/big/195778-1783582812.png?lm=1",
    "Robin Fellhauer": "https://img.a.transfermarkt.technology/portrait/big/264960-1755201733.jpg?lm=1",
    "Davide Zappacosta": "https://img.a.transfermarkt.technology/portrait/big/173859-1661268432.jpg?lm=1",
    "Robin Koch": "https://img.a.transfermarkt.technology/portrait/big/328784-1753984898.jpg?lm=1",
    "Alex Král": "https://img.a.transfermarkt.technology/portrait/big/337333-1691614545.jpg?lm=1",
    "Michel Adopo": "https://img.a.transfermarkt.technology/portrait/big/564305-1730186534.jpg?lm=1",
    "Umar Sadiq": "https://img.a.transfermarkt.technology/portrait/big/337715-1728040426.jpg?lm=1",
    "Sergio Camello": "https://img.a.transfermarkt.technology/portrait/big/505674-1775761676.jpg?lm=1",
    "Sergi Canós": "https://img.a.transfermarkt.technology/portrait/big/251845-1538466933.jpg?lm=1",
    "Anis Ben Slimane": "https://img.a.transfermarkt.technology/portrait/big/546712-1668422834.jpg?lm=1",
    "Lyle Foster": "https://img.a.transfermarkt.technology/portrait/big/467623-1779949909.jpg?lm=1",
    "Joe Worrall": "https://img.a.transfermarkt.technology/portrait/big/415970-1712666411.png?lm=1",
    "Adam Armstrong": "https://img.a.transfermarkt.technology/portrait/big/250426-1708002412.jpg?lm=1",
    "Gianluca Mancini": "https://img.a.transfermarkt.technology/portrait/big/256448-1663581060.jpg?lm=1",
    "Antonino Gallo": "https://img.a.transfermarkt.technology/portrait/big/392516-1663745734.jpg?lm=1",
    "Berat Djimsiti": "https://img.a.transfermarkt.technology/portrait/big/165513-1718627443.jpg?lm=1",
    "Ricardo Pereira": "https://img.a.transfermarkt.technology/portrait/big/215876-1720192308.jpg?lm=1",
    "Maksym Taloverov": "https://img.a.transfermarkt.technology/portrait/big/668557-1722520666.jpg?lm=1",
    "Alberto Reina": "https://img.a.transfermarkt.technology/portrait/big/603696-1712568514.jpg?lm=1",
    "Federico Bonazzoli": "https://img.a.transfermarkt.technology/portrait/big/241527-1692962795.jpg?lm=1",
    "Jan Schöppner": "https://img.a.transfermarkt.technology/portrait/big/581357-1721852254.jpg?lm=1",
    "Sebastiano Luperto": "https://img.a.transfermarkt.technology/portrait/big/278531-1730125275.jpg?lm=1",
    "Jeremy Toljan": "https://img.a.transfermarkt.technology/portrait/big/129674-1692277806.jpg?lm=1",
    "Harrison Reed": "https://img.a.transfermarkt.technology/portrait/big/226973-1762354305.jpg?lm=1",
    "Iñigo Ruiz de Galarreta": "https://img.a.transfermarkt.technology/portrait/big/126751-1709675810.png?lm=1",
    "Kervin Arriaga": "https://img.a.transfermarkt.technology/portrait/big/526050-1710094372.jpg?lm=1",
    "Marvin Ducksch": "https://img.a.transfermarkt.technology/portrait/big/125103-1772009480.jpg?lm=1",
    "Mathias Pereira Lage": "https://img.a.transfermarkt.technology/portrait/big/424072-1755031981.jpg?lm=1",
    "Munir El Haddadi": "https://img.a.transfermarkt.technology/portrait/big/223725-1687272900.jpg?lm=1",
    "Charlie Taylor": "https://img.a.transfermarkt.technology/portrait/big/195633-1700671881.jpg?lm=1",
    "Jeremy Ngakia": "https://img.a.transfermarkt.technology/portrait/big/503795-1741274481.jpg?lm=1",
    "Abde Rebbach": "https://img.a.transfermarkt.technology/portrait/big/718034-1705337308.jpg?lm=1",
    "George Campbell": "https://img.a.transfermarkt.technology/portrait/big/585769-1740596927.jpg?lm=1",
    "Niklas Dorsch": "https://img.a.transfermarkt.technology/portrait/big/251302-1755087869.jpg?lm=1",
    "Yannik Keitel": "https://img.a.transfermarkt.technology/portrait/big/342039-1773661370.jpg?lm=1",
    "Luca Waldschmidt": "https://img.a.transfermarkt.technology/portrait/big/196095-1721140192.jpg?lm=1",
    "Vakoun Bayo": "https://img.a.transfermarkt.technology/portrait/big/375877-1757604280.jpg?lm=1",
    "Lautaro Valenti": "https://img.a.transfermarkt.technology/portrait/big/625202-1725530168.jpg?lm=1",
    "Santiago Colombatto": "https://img.a.transfermarkt.technology/portrait/big/395122-1698158499.jpg?lm=1",
    "Ibrahima Niane": "https://img.a.transfermarkt.technology/portrait/big/490417-1750956872.png?lm=1",
    "Miguel de la Fuente": "https://img.a.transfermarkt.technology/portrait/big/480883-1647530867.jpg?lm=1",
    "Andrea Carboni": "https://img.a.transfermarkt.technology/portrait/big/481834-1730125183.jpg?lm=1",
    "Ethan Galbraith": "https://img.a.transfermarkt.technology/portrait/big/433991-1629189986.jpg?lm=1",
    "Valentino Lazaro": "https://img.a.transfermarkt.technology/portrait/big/186368-1692819728.jpg?lm=1",
    "Welington": "https://img.a.transfermarkt.technology/portrait/big/729264-1764146570.jpg?lm=1",
    "Omri Gandelman": "https://img.a.transfermarkt.technology/portrait/big/780548-1706693476.jpg?lm=1",
    "Mahmoud Dahoud": "https://img.a.transfermarkt.technology/portrait/big/191422-1726605307.jpg?lm=1",
    "Goduine Koyalipou": "https://img.a.transfermarkt.technology/portrait/big/525140-1714738152.png?lm=1",
    "Danel Sinani": "https://img.a.transfermarkt.technology/portrait/big/346499-1755033100.jpg?lm=1",
    "Manolis Saliakas": "https://img.a.transfermarkt.technology/portrait/big/242661-1755032759.jpg?lm=1",
    "Manu Morlanes": "https://img.a.transfermarkt.technology/portrait/big/335225-1552044533.jpg?lm=1",
    "Cédric Hountondji": "https://img.a.transfermarkt.technology/portrait/big/198709-1750956076.png?lm=1",
    "Mickaël Nadé": "https://img.a.transfermarkt.technology/portrait/big/494586-1727722979.jpg?lm=1",
    "Juanmi Latasa": "https://img.a.transfermarkt.technology/portrait/big/623521-1696862713.jpg?lm=1",
    "Fodé Doucouré": "https://img.a.transfermarkt.technology/portrait/big/798925-1669326794.jpg?lm=1",
    "Fali Candé": "https://img.a.transfermarkt.technology/portrait/big/520530-1697463489.png?lm=1",
    "Mohamed Salah": "https://img.a.transfermarkt.technology/portrait/big/148455-1727337594.jpg?lm=1",
    "Marco Verratti": "https://img.a.transfermarkt.technology/portrait/big/102558-1672304218.jpg?lm=1",
    "Loïs Openda": "https://img.a.transfermarkt.technology/portrait/big/368887-1713944805.jpg?lm=1"
};

function getPlayerPhotoUrl(name) {
    if (!name) return null;
    return TOP_PLAYER_PHOTOS[name] || null;
}

function createPlayerAvatar(name, position, sizeClass = '') {
    const initials = getInitials(name);
    const photoUrl = getPlayerPhotoUrl(name);
    if (photoUrl) {
        const safeName = (name || '').replace(/"/g, '&quot;');
        return `<div class="player-avatar has-photo ${sizeClass}" title="${safeName}">
            <img src="${photoUrl}" alt="${safeName}" loading="lazy" decoding="async"
                 onerror="if(this.src.includes('/big/')){this.src=this.src.replace('/big/','/header/');}else{this.parentElement.classList.remove('has-photo');this.parentElement.innerHTML='${initials}';}">
        </div>`;
    }
    return `<div class="player-avatar ${sizeClass}">${initials}</div>`;
}

function getUrlParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

function setUrlParams(params) {
    const url = new URL(window.location);
    Object.keys(params).forEach(key => {
        if (params[key] === null || params[key] === '' || params[key] === undefined) {
            url.searchParams.delete(key);
        } else {
            url.searchParams.set(key, params[key]);
        }
    });
    window.history.replaceState({}, '', url);
}

function createSkeleton(type = 'card') {
    if (type === 'card') {
        return `<div class="card skeleton" style="height: 160px; margin-bottom: 16px;"></div>`;
    }
    if (type === 'table-row') {
        return `
            <tr>
                <td><div class="skeleton" style="height: 20px; width: 140px;"></div></td>
                <td><div class="skeleton" style="height: 20px; width: 32px;"></div></td>
                <td><div class="skeleton" style="height: 20px; width: 44px;"></div></td>
                <td><div class="skeleton" style="height: 20px; width: 90px;"></div></td>
                <td><div class="skeleton" style="height: 20px; width: 50px;"></div></td>
                <td><div class="skeleton" style="height: 20px; width: 70px;"></div></td>
                <td><div class="skeleton" style="height: 20px; width: 70px;"></div></td>
                <td><div class="skeleton" style="height: 20px; width: 85px;"></div></td>
            </tr>
        `;
    }
    return `<div class="skeleton" style="height: 20px; width: 100%;"></div>`;
}

function createPagination(currentPage, totalPages, onPageChangeName) {
    if (totalPages <= 1) return '';
    let html = '<div class="pagination">';
    
    html += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="${onPageChangeName}(${currentPage - 1})" aria-label="Previous page">&lt;</button>`;
    
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + 4);
    
    if (start > 1) {
        html += `<button class="page-btn" onclick="${onPageChangeName}(1)">1</button>`;
        if (start > 2) html += `<span style="padding: 0 4px; color: var(--color-ink-muted);">...</span>`;
    }
    
    for (let i = start; i <= end; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="${onPageChangeName}(${i})">${i}</button>`;
    }
    
    if (end < totalPages) {
        if (end < totalPages - 1) html += `<span style="padding: 0 4px; color: var(--color-ink-muted);">...</span>`;
        html += `<button class="page-btn" onclick="${onPageChangeName}(${totalPages})">${totalPages}</button>`;
    }
    
    html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="${onPageChangeName}(${currentPage + 1})" aria-label="Next page">&gt;</button>`;
    html += '</div>';
    
    return html;
}

function showError(container, message) {
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">⚠️</div>
            <h3 class="empty-state-title">Something went sideways</h3>
            <p class="empty-state-desc">${message || "We couldn't load this data right now."}</p>
            <button class="btn btn-secondary btn-sm" onclick="window.location.reload()">Give it another shot</button>
        </div>
    `;
}

function showEmpty(container, message = "No players match. Try loosening a filter.") {
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">🔍</div>
            <h3 class="empty-state-title">Nothing here yet</h3>
            <p class="empty-state-desc">${message}</p>
        </div>
    `;
}

function showLoading(container, type = 'card', count = 4) {
    container.innerHTML = Array(count).fill(0).map(() => createSkeleton(type)).join('');
}
