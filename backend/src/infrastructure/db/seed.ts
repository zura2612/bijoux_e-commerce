import { db, initDb } from './init';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

initDb();

// Nettoyage
db.exec(`
  DELETE FROM order_items;
  DELETE FROM orders;
  DELETE FROM products;
  DELETE FROM categories;
  DELETE FROM users;
`);

// Utilisateurs
const adminPwd = bcrypt.hashSync('admin123', 10);
const clientPwd = bcrypt.hashSync('client123', 10);

db.prepare(`INSERT INTO users (id, email, password, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?)`).run(
  uuid(), 'francois.vauchot@gmail.com', adminPwd, 'Admin', 'e-Shop', 'admin'
);
db.prepare(`INSERT INTO users (id, email, password, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?)`).run(
  uuid(), 'clo.vauchot@yahoo.fr', clientPwd, 'Claudine', 'Vauchot', 'client'
);

// Catégories
const categories = [
  { name: 'Colliers', slug: 'colliers' },
  { name: 'Bracelets', slug: 'bracelets' },
  { name: 'Boucles d\'oreilles', slug: 'boucles-oreilles' },
  { name: 'Bagues', slug: 'bagues' },
];

const insertCat = db.prepare(`INSERT INTO categories (name, slug) VALUES (?, ?)`);
categories.forEach(c => insertCat.run(c.name, c.slug));

const getCatId = (slug: string): number =>
  (db.prepare(`SELECT id FROM categories WHERE slug = ?`).get(slug) as { id: number }).id;

// Produits
const products = [
  { name: 'Collier Étoile Dorée', desc: 'Délicat collier avec pendentif étoile plaqué or 18k', price: 2490, stock: 15, cat: 'colliers', img: 'collier-etoile.jpg' },
  { name: 'Collier Perles Nacrées', desc: 'Collier en perles d\'eau douce, fermoir argenté', price: 3200, stock: 8, cat: 'colliers', img: 'collier-perles.jpg' },
  { name: 'Bracelet Charm Argent', desc: 'Bracelet argent 925 avec charms interchangeables', price: 1890, stock: 20, cat: 'bracelets', img: 'bracelet-charm.jpg' },
  { name: 'Bracelet Jonc Doré', desc: 'Jonc minimaliste plaqué or, diamètre 65mm', price: 1490, stock: 25, cat: 'bracelets', img: 'bracelet-jonc.jpg' },
  { name: 'Boucles Créoles Dorées', desc: 'Créoles légères 40mm, plaquées or 18k', price: 1290, stock: 30, cat: 'boucles-oreilles', img: 'boucles-creoles.jpg' },
  { name: 'Boucles Gouttes Bleues', desc: 'Pendants gouttes en résine bleue océan', price: 990, stock: 18, cat: 'boucles-oreilles', img: 'boucles-gouttes.jpg' },
  { name: 'Bague Fleur Émaillée', desc: 'Bague ajustable avec fleur émaillée multicolore', price: 890, stock: 22, cat: 'bagues', img: 'bague-fleur.jpg' },
  { name: 'Bague Chevalière Lune', desc: 'Chevalière argentée avec croissant de lune gravé', price: 1190, stock: 12, cat: 'bagues', img: 'bague-lune.jpg' },
];

const insertProd = db.prepare(`
  INSERT INTO products (id, name, description, price_cents, stock, category_id, image_url)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

products.forEach(p => {
  insertProd.run(uuid(), p.name, p.desc, p.price, p.stock, getCatId(p.cat), `/images/products/${p.img}`);
});

console.log(' Seed.ts terminé :');
console.log(`   - 2 utilisateurs (francois.vauchot@gmail.com / clo.vauchot@yahoo.fr)`);
console.log(`   - 4 catégories`);
console.log(`   - ${products.length} produits`);

db.close();
