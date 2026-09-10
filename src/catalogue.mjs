import legacy from './vocabulary-data.json' with { type: 'json' };
import illustrations from './illustrations.json' with { type: 'json' };

export const groups = [
  { id: 'basics', label: 'Nền tảng', icon: '🔤' },
  { id: 'home', label: 'Bé và gia đình', icon: '🏡' },
  { id: 'things', label: 'Đồ dùng của bé', icon: '🧸' },
  { id: 'nature', label: 'Động vật', icon: '🐾' },
  { id: 'food', label: 'Ăn uống và cây cối', icon: '🍎' },
  { id: 'life', label: 'Cuộc sống', icon: '🌈' },
  { id: 'time', label: 'Thời gian và trường học', icon: '📅' },
];
// One canonical record per meaning; topics refer to shared word IDs.
const entries = new Map(
  legacy.words.map(({ id, word, meaning }) => [
    id,
    {
      id,
      word,
      meaning,
      kind: 'picture',
      imageFile: `images/vocabulary/${id}.png`,
    },
  ]),
);
const topicList = [];
function topic(id, label, groupId, icon, source) {
  const wordIds = source.split('|').map((item) => {
    const [word, meaning] = item.trim().split('=');
    const wordId = word.toLowerCase().replaceAll(' ', '-');
    if (!entries.has(wordId)) {
      if (!meaning) throw new Error(`Missing meaning: ${word}`);
      entries.set(wordId, {
        id: wordId,
        word,
        meaning,
        kind: 'picture',
        imageFile: `images/vocabulary/${wordId}.png`,
      });
    }
    return wordId;
  });
  topicList.push({
    id,
    label,
    shortLabel: label,
    groupId,
    icon,
    color: '#7ba526',
    description: 'Cùng bé nghe, nhìn và khám phá từng từ nhé!',
    wordIds,
  });
}
topic(
  'alphabet',
  'Bảng chữ cái',
  'basics',
  '🔤',
  Array.from(
    'abcdefghijklmnopqrstuvwxyz',
    (c) => `letter-${c}=Chữ ${c.toUpperCase()}`,
  ).join('|'),
);
topic(
  'numbers',
  'Số đếm',
  'basics',
  '🔢',
  'one=một|two=hai|three=ba|four=bốn|five=năm|six=sáu|seven=bảy|eight=tám|nine=chín|ten=mười|eleven=mười một|twelve=mười hai|thirteen=mười ba|fourteen=mười bốn|fifteen=mười lăm|sixteen=mười sáu|seventeen=mười bảy|eighteen=mười tám|nineteen=mười chín|twenty=hai mươi',
);
topic(
  'colours',
  'Màu sắc',
  'basics',
  '🎨',
  'red=đỏ|blue=xanh dương|yellow=vàng|green=xanh lá|orange-color=cam|pink=hồng|purple=tím|white=trắng|black=đen|brown=nâu|gray=xám',
);
topic(
  'shapes',
  'Hình khối',
  'basics',
  '🔺',
  'circle=hình tròn|square=hình vuông|triangle=hình tam giác|rectangle=hình chữ nhật|oval=hình bầu dục|star-shape=hình ngôi sao|heart-shape=hình trái tim|diamond=hình thoi',
);
topic(
  'body',
  'Bộ phận cơ thể',
  'home',
  '👋',
  'head|hair|eye|ear|nose|mouth|hand|arm|leg|foot|finger=ngón tay|knee=đầu gối|tooth=răng|tongue=lưỡi',
);
topic(
  'family',
  'Gia đình',
  'home',
  '👨‍👩‍👧',
  'mother|father|brother|sister|baby|grandmother|grandfather|family|boy|girl',
);
topic(
  'house',
  'Ngôi nhà',
  'home',
  '🏠',
  'house=ngôi nhà|roof=mái nhà|window=cửa sổ|door|wall=bức tường|floor=sàn nhà|stairs=cầu thang|bedroom=phòng ngủ|living-room=phòng khách|kitchen=phòng bếp|bathroom=phòng tắm|garden',
);
topic(
  'living',
  'Phòng khách',
  'home',
  '🛋️',
  'sofa|television|table|chair|fan|picture|shelf|curtain|carpet|door|clock|lamp',
);
topic(
  'kitchen',
  'Phòng bếp',
  'home',
  '🍽️',
  'cup|plate|bowl|spoon|fork|knife|bottle|fridge|stove|pan|chopsticks=đũa|pot-cooking=nồi nấu ăn',
);
topic(
  'bedroom',
  'Phòng ngủ',
  'home',
  '🛏️',
  'bed|pillow|blanket|lamp|wardrobe|mirror|clock|pajamas|slippers|teddy bear|curtain|shelf',
);
topic(
  'hygiene',
  'Phòng tắm',
  'home',
  '🪥',
  'toothbrush|toothpaste|soap|towel|comb|shampoo|toilet|sink|shower|tissue|bathtub=bồn tắm|bucket=cái xô',
);
topic(
  'garden',
  'Vườn',
  'home',
  '🌻',
  'tree|flower|grass|leaf|plant|pot|fence|gate|swing|garden|watering-can=bình tưới cây|seed=hạt giống',
);
topic(
  'toys',
  'Đồ chơi',
  'things',
  '🧸',
  'ball|bicycle|kite|doll|robot|blocks|puzzle|toy car|toy train|drum|balloon=bóng bay|bubbles=bong bóng xà phòng',
);
topic(
  'classroom',
  'Đồ dùng học tập',
  'things',
  '✏️',
  'book|pencil|backpack|eraser|pen|desk|ruler|board|crayon=bút sáp màu|notebook=quyển vở|glue=keo dán|scissors=kéo thủ công',
);
topic(
  'clothes',
  'Trang phục và phụ kiện',
  'things',
  '👕',
  'shirt|pants|dress|skirt|shoes|socks|hat|jacket|shorts|uniform|raincoat=áo mưa|gloves=găng tay|scarf=khăn quàng',
);
topic(
  'animals',
  'Các loài động vật',
  'nature',
  '🐾',
  'cat|dog|rabbit|bird|fish|turtle|cow|pig|duck|chicken|elephant=con voi|butterfly=con bướm',
);
topic(
  'wild',
  'Động vật hoang dã',
  'nature',
  '🦁',
  'elephant|lion=sư tử|tiger=con hổ|monkey=con khỉ|giraffe=hươu cao cổ|zebra=ngựa vằn|bear=con gấu|panda=gấu trúc|deer=con hươu|fox=con cáo|crocodile=cá sấu|kangaroo=chuột túi',
);
topic(
  'domestic',
  'Động vật nuôi',
  'nature',
  '🐕',
  'cat|dog|rabbit|cow|pig|duck|chicken|goat=con dê|sheep=con cừu|horse=con ngựa|buffalo=con trâu|hamster=chuột hamster',
);
topic(
  'aquatic',
  'Động vật dưới nước',
  'nature',
  '🐠',
  'fish|turtle|crab=con cua|shrimp=con tôm|octopus=bạch tuộc|squid=con mực|dolphin=cá heo|whale=cá voi|shark=cá mập|seahorse=cá ngựa|starfish=sao biển|jellyfish=sứa',
);
topic(
  'birds',
  'Các loài chim',
  'nature',
  '🐦',
  'bird|duck|chicken|parrot=con vẹt|owl=chim cú|penguin=chim cánh cụt|pigeon=chim bồ câu|sparrow=chim sẻ|peacock=chim công|goose=con ngỗng',
);
topic(
  'insects',
  'Côn trùng',
  'nature',
  '🦋',
  'butterfly|bee=con ong|ant=con kiến|ladybug=bọ rùa|dragonfly=chuồn chuồn|mosquito=con muỗi|fly=con ruồi|grasshopper=châu chấu',
);
topic(
  'vegetables',
  'Các loại rau',
  'food',
  '🥦',
  'cabbage=bắp cải|lettuce=rau xà lách|spinach=rau chân vịt|broccoli=bông cải xanh|cauliflower=bông cải trắng|cucumber=dưa chuột|tomato=cà chua|pumpkin=bí đỏ|corn=bắp ngô|peas=đậu Hà Lan|green-beans=đậu que|water-spinach=rau muống',
);
topic(
  'tubers',
  'Các loại củ',
  'food',
  '🥕',
  'carrot=cà rốt|potato=khoai tây|sweet-potato=khoai lang|radish=củ cải|onion=củ hành tây|garlic=củ tỏi|ginger=gừng|taro=khoai môn',
);
topic(
  'fruits',
  'Các loại quả',
  'food',
  '🍉',
  'apple|banana|orange|mango=xoài|watermelon=dưa hấu|grapes=nho|strawberry=dâu tây|pineapple=dứa|papaya=đu đủ|guava=ổi|dragon-fruit=thanh long|coconut=dừa|pear=quả lê',
);
topic(
  'flowers',
  'Các loài hoa',
  'food',
  '🌷',
  'rose=hoa hồng|sunflower=hoa hướng dương|lotus=hoa sen|daisy=hoa cúc|orchid=hoa lan|tulip=hoa tulip',
);
topic(
  'food',
  'Thức ăn',
  'food',
  '🍚',
  'bread|egg|cake|rice|soup|noodles=mì sợi|porridge=cháo|sandwich=bánh mì kẹp|pizza=bánh pizza|pancake=bánh kếp|yogurt=sữa chua|ice-cream=kem',
);
topic(
  'drinks',
  'Đồ uống',
  'food',
  '🥛',
  'water|milk|orange-juice=nước cam|apple-juice=nước táo|coconut-water=nước dừa|lemonade=nước chanh|smoothie=sinh tố|cocoa=ca cao',
);
topic(
  'transport',
  'Phương tiện giao thông',
  'life',
  '🚌',
  'bicycle|car=ô tô|bus=xe buýt|train=tàu hỏa|plane=máy bay|boat=thuyền|ship=tàu thủy|motorbike=xe máy|truck=xe tải|taxi=xe taxi|ambulance=xe cứu thương|fire-engine=xe cứu hỏa',
);
topic(
  'jobs',
  'Nghề nghiệp',
  'life',
  '👩‍⚕️',
  'teacher|doctor=bác sĩ|nurse=y tá|farmer=nông dân|cook=đầu bếp|driver=tài xế|police-officer=cảnh sát|firefighter=lính cứu hỏa|dentist=nha sĩ|pilot=phi công|builder=thợ xây|singer=ca sĩ',
);
topic(
  'sports',
  'Thể thao',
  'life',
  '⚽',
  'soccer=bóng đá|basketball=bóng rổ|badminton=cầu lông|tennis=quần vợt|swimming=bơi lội|running=chạy bộ|cycling=đạp xe|skating=trượt patin',
);
topic(
  'places',
  'Địa điểm',
  'life',
  '🏞️',
  'school|house|park=công viên|zoo=sở thú|hospital=bệnh viện|market=chợ|supermarket=siêu thị|playground=sân chơi|library=thư viện|bakery=tiệm bánh|restaurant=nhà hàng|beach=bãi biển',
);
topic(
  'landscapes',
  'Phong cảnh',
  'life',
  '🏔️',
  'mountain=ngọn núi|river=dòng sông|lake=hồ nước|sea=biển|beach|forest=khu rừng|hill=ngọn đồi|island=hòn đảo|waterfall=thác nước|field=cánh đồng',
);
topic(
  'feelings',
  'Cảm xúc',
  'life',
  '😊',
  'happy=vui vẻ|sad=buồn|angry=tức giận|scared=sợ hãi|surprised=ngạc nhiên|sleepy=buồn ngủ|tired=mệt|excited=háo hức',
);
topic(
  'hobbies',
  'Sở thích',
  'life',
  '🖍️',
  'drawing=vẽ tranh|coloring=tô màu|singing=ca hát|dancing=nhảy múa|reading=đọc sách|swimming|cycling|gardening=làm vườn|cooking=nấu ăn|flying-a-kite=thả diều|playing-with-blocks=chơi xếp hình|playing-with-bubbles=chơi bong bóng xà phòng',
);
topic(
  'actions',
  'Hành động',
  'life',
  '🙌',
  'eat=ăn|drink=uống|sleep=ngủ|walk=đi bộ|run=chạy|jump=nhảy|sit=ngồi|stand=đứng|clap=vỗ tay|wave=vẫy tay|wash-hands=rửa tay|brush-teeth=đánh răng|hug=ôm|smile=mỉm cười|tidy-up=dọn dẹp',
);
topic(
  'days',
  'Các ngày trong tuần',
  'time',
  '📆',
  'Monday=thứ Hai|Tuesday=thứ Ba|Wednesday=thứ Tư|Thursday=thứ Năm|Friday=thứ Sáu|Saturday=thứ Bảy|Sunday=Chủ nhật',
);
topic(
  'months',
  'Các tháng trong năm',
  'time',
  '🗓️',
  'January=tháng Một|February=tháng Hai|March=tháng Ba|April=tháng Tư|May=tháng Năm|June=tháng Sáu|July=tháng Bảy|August=tháng Tám|September=tháng Chín|October=tháng Mười|November=tháng Mười một|December=tháng Mười hai',
);
topic(
  'seasons',
  'Các mùa',
  'time',
  '🍂',
  'spring=mùa xuân|summer=mùa hè|autumn=mùa thu|winter=mùa đông',
);
topic(
  'weather',
  'Thời tiết',
  'time',
  '🌦️',
  'sunny=trời nắng|rainy=trời mưa|cloudy=trời nhiều mây|windy=trời có gió|snowy=trời có tuyết|hot=nóng|cold=lạnh|rainbow=cầu vồng',
);
topic(
  'school',
  'Trường học',
  'time',
  '🏫',
  'school|teacher|classroom=lớp học|student=học sinh|playground|library|desk|chair|board|book|backpack|school-bus=xe đưa đón học sinh',
);
topic(
  'subjects',
  'Các môn học',
  'time',
  '📚',
  'English=tiếng Anh|Vietnamese=tiếng Việt|math=toán|art=mỹ thuật|music=âm nhạc|PE=thể dục',
);

for (const entry of entries.values())
  entry.word = entry.word.replaceAll('-', ' ');
entries.get('orange-color').word = 'orange';
entries.get('star-shape').word = 'star';
entries.get('heart-shape').word = 'heart';
entries.get('pot-cooking').word = 'pot';
const colours = [
  '#e53135',
  '#2865db',
  '#ffdb27',
  '#29944d',
  '#ff8b21',
  '#f695c6',
  '#8737bd',
  '#ffffff',
  '#191b21',
  '#875132',
  '#90959b',
];
const shapeNames = [
  'circle',
  'square',
  'triangle',
  'rectangle',
  'oval',
  'star',
  'heart',
  'diamond',
];
function decorate(topicId, fn) {
  topicList
    .find((t) => t.id === topicId)
    .wordIds.forEach((id, index) => Object.assign(entries.get(id), fn(index)));
}
decorate('numbers', (index) => ({
  kind: 'number',
  value: String(index + 1),
  imageFile: '',
}));
decorate('colours', (index) => ({
  kind: 'color',
  value: colours[index],
  imageFile: '',
}));
decorate('shapes', (index) => ({
  kind: 'shape',
  value: shapeNames[index],
  imageFile: '',
}));
decorate('days', (index) => ({
  kind: 'day',
  value: String(index + 1),
  imageFile: '',
}));
decorate('months', (index) => ({
  kind: 'month',
  value: String(index + 1),
  imageFile: '',
}));
const phonics = [
  ['æ', 'apple'],
  ['b', 'ball'],
  ['k', 'cat'],
  ['d', 'dog'],
  ['ɛ', 'egg'],
  ['f', 'fish'],
  ['g', 'goat'],
  ['h', 'hat'],
  ['ɪ', 'insect'],
  ['dʒ', 'jump'],
  ['k', 'kite'],
  ['l', 'lion'],
  ['m', 'monkey'],
  ['n', 'nose'],
  ['ɑ', 'octopus'],
  ['p', 'pig'],
  ['kw', 'queen'],
  ['ɹ', 'rabbit'],
  ['s', 'sun'],
  ['t', 'turtle'],
  ['ʌ', 'umbrella'],
  ['v', 'van'],
  ['w', 'window'],
  ['ks', 'box'],
  ['j', 'yogurt'],
  ['z', 'zebra'],
];
for (const [id, meaning] of [
  ['insect', 'côn trùng'],
  ['queen', 'nữ hoàng'],
  ['sun', 'mặt trời'],
  ['umbrella', 'cái ô'],
  ['van', 'xe tải nhỏ'],
  ['box', 'cái hộp'],
]) {
  entries.set(id, {
    id,
    word: id,
    meaning,
    kind: 'picture',
    imageFile: `images/vocabulary/${id}.png`,
  });
}
decorate('alphabet', (index) => {
  const upper = String.fromCharCode(65 + index);
  return {
    kind: 'letter',
    word: upper,
    value: `${upper} ${upper.toLowerCase()}`,
    imageFile: '',
    phoneme: phonics[index][0],
    exampleId: phonics[index][1],
  };
});
export const themes = topicList;
for (const [id, illustration] of Object.entries(illustrations)) {
  const word = entries.get(id);
  if (word)
    Object.assign(word, {
      imageFile: illustration.file,
      spriteIndex: illustration.index,
    });
}
export const allWords = [...entries.values()];
const memberIds = new Set(themes.flatMap((t) => t.wordIds));
export const vocabulary = allWords.filter((w) => memberIds.has(w.id));
export function wordsForTheme(id) {
  return (themes.find((t) => t.id === id)?.wordIds ?? []).map((wordId) =>
    entries.get(wordId),
  );
}
export function wordById(id) {
  return entries.get(id);
}
