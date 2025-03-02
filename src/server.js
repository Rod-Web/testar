const express = require('express');
const multer = require('multer');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;
const SECRET = 'meusegredo';  // Chave secreta para JWT

app.use(express.json());
app.use(express.static('public'));  // Serve arquivos estáticos como HTML, CSS, JS
app.use(express.urlencoded({ extended: true }));

// Configuração do multer para armazenar as imagens
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');  // Pasta onde as imagens serão salvas
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);  // Gera nome único para o arquivo
  }
});
const upload = multer({ storage });

// Função para carregar os usuários do arquivo JSON
const loadUsers = () => {
  try {
    return JSON.parse(fs.readFileSync('data/users.json', 'utf8'));
  } catch (error) {
    return [];
  }
};

// Função para salvar os usuários no arquivo JSON
const saveUsers = (users) => {
  fs.writeFileSync('data/users.json', JSON.stringify(users, null, 2));
};

// Rota de login (sem criptografia de senha)
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  let users = loadUsers();

  let user = users.find(u => u.username === username);

  // Verifica se o usuário existe e se a senha está correta (sem bcrypt)
  if (!user || user.password !== password) {
    return res.status(401).json({ message: 'Usuário ou senha incorretos' });
  }

  // Cria o token de autenticação
  const token = jwt.sign({ username: user.username }, SECRET, { expiresIn: '1h' });

  // Verifica se o usuário já enviou uma imagem
  if (!user.image) {
    return res.json({ token, redirect: '/upload.html' });
  }

  return res.json({ token, redirect: '/gallery.html' });
});

// Rota para o upload de imagem
app.post('/upload', upload.single('image'), (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token inválido' });

  try {
    const decoded = jwt.verify(token, SECRET);
    let users = loadUsers();
    let user = users.find(u => u.username === decoded.username);

    if (user) {
      user.image = `/uploads/${req.file.filename}`;  // Atualiza a imagem do usuário
      saveUsers(users);
      return res.json({ redirect: '/gallery.html' });
    }
  } catch (error) {
    return res.status(403).json({ message: 'Token inválido' });
  }
});

// Rota para visualizar as imagens
app.get('/images', (req, res) => {
  let users = loadUsers();
  res.json(users.map(u => ({ username: u.username, image: u.image })));
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});