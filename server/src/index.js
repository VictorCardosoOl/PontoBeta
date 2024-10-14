const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const XLSXPopulate = require('xlsx-populate');

// Inicializando a instância de app
const app = express();
const port = 3000; // Porta para o servidor

// Caminho do arquivo pontos.json
const dataFilePath = path.join(__dirname, 'pontos.json');

// Middleware para permitir requisições CORS e parseamento de JSON
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

// Função para carregar os pontos do arquivo pontos.json
const loadPontos = () => {
    if (fs.existsSync(dataFilePath)) {
        const rawData = fs.readFileSync(dataFilePath, 'utf8');
        return JSON.parse(rawData);
    }
    return [];
};

// Função para salvar os pontos no arquivo pontos.json
const savePontos = (pontos) => {
    fs.writeFileSync(dataFilePath, JSON.stringify(pontos, null, 2), 'utf8');
};

// Função para calcular horas trabalhadas
const calcularHorasTrabalhadas = (ponto) => {
    const entrada = new Date(`1970-01-01T${ponto.Entrada}:00`);
    const saida = new Date(`1970-01-01T${ponto.Saída}:00`);
    const retornoCafé1 = new Date(`1970-01-01T${ponto['Retorno Café 1']}:00`);
    const café1 = new Date(`1970-01-01T${ponto['Café 1']}:00`);
    const retornoAlmoço = new Date(`1970-01-01T${ponto['Retorno Almoço']}:00`);
    const almoço = new Date(`1970-01-01T${ponto.Almoço}:00`);
    const retornoCafé2 = new Date(`1970-01-01T${ponto['Retorno Café 2']}:00`);
    const café2 = new Date(`1970-01-01T${ponto['Café 2']}:00`);

    let totalHoras = 0;

    if (ponto.categoria === 'CLT') {
        totalHoras = (saida - entrada) - (retornoCafé1 - café1) - (retornoAlmoço - almoço) - (retornoCafé2 - café2);
    } else if (ponto.categoria === 'Estagiário') {
        totalHoras = (saida - entrada) - (retornoCafé1 - café1) - (retornoAlmoço - almoço);
    }

    return (totalHoras / (1000 * 60 * 60)).toFixed(2);
};

// Funções de rotas
app.get('/pontos', (req, res) => {
    const pontos = loadPontos();
    res.json(pontos);
});

app.post('/pontos', (req, res) => {
    const { nome, categoria, tipo, data, hora } = req.body;

    if (!nome || !categoria || !tipo || !data || !hora) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    const pontos = loadPontos();
    const estruturaPonto = {
        data,
        nome,
        categoria,
        Entrada: '',
        'Café 1': '',
        'Retorno Café 1': '',
        'Almoço': '',
        'Retorno Almoço': '',
        'Café 2': '',
        'Retorno Café 2': '',
        Saída: ''
    };

    const pontoExistente = pontos.find(ponto => ponto.nome === nome && ponto.data === data);
    if (pontoExistente) {
        pontoExistente[tipo] = hora;
    } else {
        Object.assign(estruturaPonto, { [tipo]: hora });
        pontos.push(estruturaPonto);
    }

    savePontos(pontos);
    res.status(201).json({ message: 'Ponto registrado com sucesso' });
});

app.get('/exportar', async (req, res) => {
    const pontos = loadPontos();

    try {
        const workbook = await XLSXPopulate.fromBlankAsync();
        const sheet = workbook.sheet(0);

        const headers = ['Data', 'Nome', 'Categoria', 'Entrada', 'Café 1', 'Retorno Café 1', 'Almoço', 'Retorno Almoço', 'Café 2', 'Retorno Café 2', 'Saída', 'Total de Horas Trabalhadas'];
        headers.forEach((header, index) => {
            sheet.cell(`${String.fromCharCode(65 + index)}1`).value(header);
        });

        pontos.forEach((ponto, index) => {
            sheet.cell(`A${index + 2}`).value(ponto.data);
            sheet.cell(`B${index + 2}`).value(ponto.nome);
            sheet.cell(`C${index + 2}`).value(ponto.categoria);
            sheet.cell(`D${index + 2}`).value(ponto.Entrada);
            sheet.cell(`E${index + 2}`).value(ponto['Café 1']);
            sheet.cell(`F${index + 2}`).value(ponto['Retorno Café 1']);
            sheet.cell(`G${index + 2}`).value(ponto.Almoço);
            sheet.cell(`H${index + 2}`).value(ponto['Retorno Almoço']);
            sheet.cell(`I${index + 2}`).value(ponto['Café 2']);
            sheet.cell(`J${index + 2}`).value(ponto['Retorno Café 2']);
            sheet.cell(`K${index + 2}`).value(ponto.Saída);
            sheet.cell(`L${index + 2}`).value(calcularHorasTrabalhadas(ponto));
        });

        const data = await workbook.outputAsync();
        res.setHeader('Content-Disposition', 'attachment; filename="controle_pontos.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(data);
    } catch (error) {
        console.error('Erro ao exportar:', error);
        res.status(500).json({ error: 'Erro ao exportar a planilha' });
    }
});

// Iniciar o servidor na porta 3000
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
