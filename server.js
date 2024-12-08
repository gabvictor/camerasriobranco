const express = require('express');
const request = require('request');
const cors = require('cors');
const fs = require('fs');
const path = require('path'); // Adicionado para lidar com caminhos de arquivos
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve arquivos estáticos da pasta 'public'


// Rota proxy para acessar as imagens da câmera
app.get('/proxy/camera', (req, res) => {
    const code = req.query.code;
    const url = `https://cameras.riobranco.ac.gov.br/api/camera?code=${code}`;
    request(url).pipe(res);
});

{
// Função para verificar se o código já está no arquivo
function codigoJaExiste(codigo, callback) {
    fs.readFile('codigos-validos.txt', 'utf8', (err, data) => {
        if (err) {
            return callback(false);
        }
        // Verifica se o código já está no arquivo
        const codigos = data.split('\n').filter(Boolean); // Remove linhas vazias
        callback(codigos.includes(`Código: ${codigo}`));
    });
}

// Função para ler o último código salvo
function lerUltimoCodigo(callback) {
    fs.readFile('ultimo-codigo.txt', 'utf8', (err, data) => {
        if (err) {
            return callback(1000); // Se o arquivo não existir, começa em 1000
        }
        callback(Number(data.trim()) || 1000);
    });
}

// Nova rota para salvar o código no arquivo de texto, evitando duplicatas
app.post('/save-code', (req, res) => {
    const { code } = req.body;
    if (!code) {
        return res.status(400).send('Código não enviado.');
    }

    codigoJaExiste(code, (existe) => {
        if (existe) {
            return res.status(200).send('Código já existe no arquivo.');
        }

        fs.appendFile('codigos-validos.txt', `Código: ${code}\n`, (err) => {
            if (err) {
                console.error('Erro ao salvar o código no arquivo:', err);
                return res.status(500).send('Erro ao salvar o código.');
            }
            console.log(`Código ${code} salvo no arquivo.`);
            // Atualiza o último código salvo
            fs.writeFile('ultimo-codigo.txt', code, (err) => {
                if (err) {
                    console.error('Erro ao salvar o último código:', err);
                }
            });
            res.send('Código salvo com sucesso.');
        });
    });
});

// Rota para obter o último código salvo
app.get('/ultimo-codigo', (req, res) => {
    lerUltimoCodigo((codigo) => {
        res.send({ ultimoCodigo: codigo });
    });
});

// Rota para obter todos os códigos do arquivo
app.get('/codigos', (req, res) => {
    fs.readFile('codigos-validos.txt', 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('Erro ao ler o arquivo de códigos.');
        }
        // Extrai os códigos do formato "Código: 001XXX"
        const codigos = data.split('\n')
            .filter(line => line.trim() !== '') // Remove linhas vazias
            .map(line => line.replace('Código: ', '').trim()); // Remove "Código: " e espaços
        res.send({ codigos });
    });
});
}

// Rota para servir o index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/camera.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'camera.json')); // Certifique-se de que o caminho está correto
});

// Inicia o servidor na porta 3001
app.listen(3001, () => {
    console.log('Servidor proxy rodando na porta 3001');
});
