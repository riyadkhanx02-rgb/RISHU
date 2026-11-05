import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const images: Record<string, string[]> = {
  polo: ['photo-1620012253295-c15a3e2c5e8b','photo-1618354691373-d851c5c3a990','photo-1627225924765-552d49cf47ad','photo-1625910513413-5fc45c9b6f37'],
  tee: ['photo-1521572163474-6864f9cf17ab','photo-1503341504253-dff4815485f1','photo-1523381210434-271e8be1f52b','photo-1562157873-818bc0726f68'],
  pants: ['photo-1473966968600-fa801b869a1a','photo-1515886657613-9f3515b0c78f','photo-1517365830460-955ce3ccd263'],
  shirt: ['photo-1596755094514-f87e34085b2c','photo-1603252109303-2751441dd157','photo-1602810318383-e386cc2a3ccf'],
  coat: ['photo-1548126032-079a0fb0099d','photo-1539533018447-63fcce2678e3','photo-1591047139829-d91aecb6caea'],
  jeans: ['photo-1542272604-787c3835535d','photo-1541099649105-f69ad21f3246'],
  shorts: ['photo-1591195853828-11db59a44f6b','photo-1517438476312-10d79c077509'],
  cap: ['photo-1521369909029-2afed882baee','photo-1588850561407-ed78c282e89b'],
  sunglasses: ['photo-1511499767150-a48a237f0083','photo-1517841905240-472988babdf9'],
  shoes: ['photo-1542291026-7eec264c27ff','photo-1495555961986-6d4c1ecb7be3']
};
function photo(key: string, n: number) {
  const id = images[key][n % images[key].length];
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=85`;
}
const products: {name:string;slug:string;category:string;description:string;price:number;imageUrl:string;availableSizes:string[];colors:string[]}[] = [];
function add(category:string, key:string, names:string[], prices:number[], oneSize=false) {
  names.forEach((name,i)=>products.push({
    name, slug:name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),
    category, description:'A considered RISHU essential, designed for effortless everyday dressing.',
    price:prices[i] ?? prices[0], imageUrl:photo(key,i), availableSizes:oneSize?['One size']:key==='shoes'?['40','41','42','43','44','45']:key==='pants'||key==='jeans'||key==='shorts'?['S','M','L','XL']:sizes, colors:key==='sunglasses'?['Tortoise','Black','Gold']:key==='shoes'?['White','Brown','Black']:['Ivory','Navy','Forest Green','Black','Stone']
  }));
}
add('Polo Shirts','polo',[
'The Riviera Piqué Polo','The Mercer Knit Polo','The Heritage Stripe Polo','The Como Cotton Polo','The Club Collar Polo',
'The Amalfi Rib Polo','The Oxford Polo','The Siena Fine-Knit Polo','The Signature Crest Polo','The Ecru Resort Polo',
'The Navy Classic Polo','The Forest Green Polo','The Sandstone Polo','The Midnight Polo','The Breton Stripe Polo',
'The Open-Collar Polo','The Textured Cotton Polo','The Monogram Polo','The Summer Weight Polo','The Parisian Polo'
], [69,85,75,72,79,82,74,89,79,72,69,69,72,69,78,76,82,89,74,85]);
add('T-Shirts','tee',[
'The Essential Heavy Tee','The Relaxed Cotton Tee','The Vintage Wash Tee','The Boxy Ivory Tee','The Paris Graphic Tee',
'The Everyday Black Tee','The Forest Green Tee','The Sandstone Tee','The Signature Chest Tee','The Supima Crew Tee',
'The Ribbed Collar Tee','The Washed Navy Tee','The Minimal Logo Tee','The Weekend Tee','The Organic Cotton Tee',
'The Oversized Tee','The Structured White Tee','The Fine Jersey Tee','The Tonal Embroidery Tee','The Classic Fit Tee'
], [39,42,45,42,49,39,42,42,49,55,45,45,49,42,52,46,42,49,55,39]);
add('Trousers','pants',['The Old Money Pleated Trouser','The Tailored Wool Trouser','The Relaxed Linen Trouser','The Straight Chino','The Gurkha Trouser','The Double-Pleat Trouser','The Everyday Drawstring Trouser','The Wide-Leg Trouser'],[105,145,99,89,119,125,79,109]);
add('Shirts','shirt',['The Oxford Button-Down','The Fine Stripe Shirt','The Linen Resort Shirt','The White Poplin Shirt','The Blue Pinstripe Shirt','The Soft Brushed Shirt'],[89,95,99,85,92,105]);
add('Long Coats','coat',['The Heritage Long Coat','The Double-Breasted Overcoat','The Camel Wool Coat','The City Mac Coat'],[245,289,275,225]);
add('Jeans','jeans',['The Classic Straight Jean','The Vintage Blue Jean','The Ecru Denim Jean','The Relaxed Selvedge Jean'],[95,99,105,135]);
add('Shorts','shorts',['The Tailored Summer Short','The Linen Drawstring Short','The Classic Chino Short','The Weekend Short'],[69,75,65,59]);
add('Caps','cap',['The RISHU Heritage Cap','The Minimal Cotton Cap','The Paris 6-Panel Cap','The Corduroy Cap'],[35,39,39,42],true);
add('Sunglasses','sunglasses',['The Riviera Acetate Sunglasses','The Classic Tortoise Frame','The Minimal Gold Aviator','The Paris Optical Frame'],[79,89,95,85],true);
add('Shoes','shoes',['The Court Leather Sneaker','The Suede Weekend Loafer','The Minimal White Trainer','The Classic Penny Loafer'],[125,165,119,179]);

async function main() {
  for (const p of products) await db.product.upsert({ where: { slug: p.slug }, update: { name:p.name,category:p.category,description:p.description,price:p.price,imageUrl:p.imageUrl,availableSizes:p.availableSizes,colors:p.colors,active:true }, create:p });
  console.log(`Seeded ${products.length} RISHU products.`);
}
main().finally(()=>db.$disconnect());
