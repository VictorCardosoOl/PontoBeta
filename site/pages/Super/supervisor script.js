document.addEventListener('DOMContentLoaded', function () {
    const nomeInput = document.getElementById('nome');
    const tipoSelect = document.getElementById('tipo');
    const baterPontoBtn = document.getElementById('baterPonto');
    const tabelaBody = document.getElementById('tabelaBody');
    const paginationDiv = document.getElementById('pagination');

    let pontosSalvos = [];
    let pontosFiltrados = [];
    let paginaAtual = 1;
    const pontosPorPagina = 5;

    // Carregar nome, tipo e categoria do localStorage
    if (localStorage.getItem('nome')) {
        nomeInput.value = localStorage.getItem('nome');
    }
    
    if (localStorage.getItem('tipo')) {
        tipoSelect.value = localStorage.getItem('tipo');
    }
    
    const categoriaSalva = localStorage.getItem('categoria');
    if (categoriaSalva) {
        const radioButton = document.querySelector(`input[name="categoria"][value="${categoriaSalva}"]`);
        if (radioButton) {
            radioButton.checked = true;
        }
    }

    function avancarTipo() {
        const opcoes = Array.from(tipoSelect.options);
        const indiceAtual = opcoes.findIndex(option => option.value === tipoSelect.value);
        
        if (indiceAtual >= 0 && indiceAtual < opcoes.length - 1) {
            tipoSelect.selectedIndex = indiceAtual + 1; // Avançar para o próximo tipo
        } else {
            tipoSelect.selectedIndex = 1; // Reiniciar no primeiro tipo se chegar ao final
        }
        // Salvar o novo tipo no localStorage
        localStorage.setItem('tipo', tipoSelect.value);
    }
    
    baterPontoBtn.addEventListener('click', (event) => {
        event.preventDefault();
        
        // Capturando valores
        const nome = nomeInput.value.trim();
        const tipo = tipoSelect.value;
        const data = new Date().toLocaleDateString('pt-BR');
        const hora = new Date().toLocaleTimeString('pt-BR');
        const categoria = document.querySelector('input[name="categoria"]:checked')?.value;

        // Verificando se todos os campos estão preenchidos
        if (!nome || !tipo || !categoria) {
            alert('Ops! Algum campo não foi preenchido');
            return;
        }

        // Salvar nome, tipo e categoria no localStorage
        localStorage.setItem('nome', nome);
        localStorage.setItem('tipo', tipo);
        localStorage.setItem('categoria', categoria);

        const ponto = { 
            id: Date.now(), 
            nome, 
            categoria, 
            tipo, 
            data, 
            hora 
        };

        fetch('http://localhost:3000/pontos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ponto),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao registrar ponto.');
            }
            return response.json();
        })
        .then(data => {
            console.log('Ponto registrado com sucesso:', data);
            carregarPontos();  // Atualiza a tabela
            avancarTipo();     // Avança para o próximo tipo de ponto
        })
        .catch(error => console.error('Erro ao registrar ponto:', error));
    });

    function carregarPontos() {
        fetch('http://localhost:3000/pontos')
            .then(response => response.json())
            .then(pontos => {
                pontosSalvos = pontos;
                aplicarFiltros(); 
            })
            .catch(error => console.error('Erro ao carregar pontos:', error));
    }

    function atualizarTabela() {
        tabelaBody.innerHTML = '';
        const startIndex = (paginaAtual - 1) * pontosPorPagina;
        const endIndex = startIndex + pontosPorPagina;

        pontosFiltrados.slice(startIndex, endIndex).forEach(ponto => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${ponto.data}</td>
                <td>${ponto.nome}</td>
                <td>${ponto.categoria}</td>
                <td>${ponto.Entrada || ''}</td>
                <td>${ponto['Café 1'] || ''}</td>
                <td>${ponto['Retorno Café 1'] || ''}</td>
                <td>${ponto.Almoço || ''}</td>
                <td>${ponto['Retorno Almoço'] || ''}</td>
                <td>${ponto['Café 2'] || ''}</td>
                <td>${ponto['Retorno Café 2'] || ''}</td>
                <td>${ponto.Saída || ''}</td>
            `;
            tabelaBody.appendChild(row);
        });

        atualizarPaginas();
    }
    
    function aplicarFiltros() {
        const nomeFiltro = document.getElementById('filtroNome').value.toLowerCase();
        const tipoColaboradorFiltro = document.getElementById('tipoColaboradorFiltro').value;
        const mesFiltro = document.getElementById('mesFiltro').value;

        pontosFiltrados = pontosSalvos.filter(ponto => {
            const nomeMatch = ponto.nome.toLowerCase().includes(nomeFiltro);
            
            const pontoData = new Date(ponto.data.split('/').reverse().join('-'));

            const colaboradorMatch = tipoColaboradorFiltro ? ponto.categoria === tipoColaboradorFiltro : true;
            const mesMatch = mesFiltro ? pontoData.getMonth() === parseInt(mesFiltro) : true;

            return nomeMatch && colaboradorMatch && mesMatch;
        });

        pontosFiltrados.sort((a, b) => new Date(b.data) - new Date(a.data));
        atualizarTabela();
    }

    document.getElementById('filtroNome').addEventListener('input', aplicarFiltros);
    document.getElementById('tipoColaboradorFiltro').addEventListener('change', aplicarFiltros);
    document.getElementById('mesFiltro').addEventListener('change', aplicarFiltros);

    function atualizarPaginas() {
        const totalPaginas = Math.ceil(pontosFiltrados.length / pontosPorPagina);
        paginationDiv.innerHTML = '';

        for (let i = 1; i <= totalPaginas; i++) {
            const pageButton = document.createElement('button');
            pageButton.innerText = i;
            pageButton.classList.toggle('page-active', i === paginaAtual);

            pageButton.addEventListener('click', () => {
                paginaAtual = i;
                atualizarTabela();
            });

            paginationDiv.appendChild(pageButton);
        }
    }    

    document.getElementById('exportarExcel').addEventListener('click', () => {
        const filtradosParaExportacao = aplicarFiltrosParaExportacao();
        exportarParaExcel(filtradosParaExportacao);
    });

    function aplicarFiltrosParaExportacao() {
        const nomeFiltro = document.getElementById('filtroNome1').value.toLowerCase();
        const dataInicio = document.getElementById('dataInicio1').value;
        const dataFim = document.getElementById('dataFim1').value;
        const tipoColaboradorFiltro = document.getElementById('tipoColaboradorFiltro1').value;

        return pontosSalvos.filter(ponto => {
            const nomeMatch = ponto.nome.toLowerCase().includes(nomeFiltro);
            
            const pontoData = new Date(ponto.data.split('/').reverse().join('-'));
            const dataInicioMatch = dataInicio ? pontoData >= new Date(dataInicio) : true;
            const dataFimMatch = dataFim ? pontoData <= new Date(dataFim) : true;
            const colaboradorMatch = tipoColaboradorFiltro ? ponto.categoria === tipoColaboradorFiltro : true;

            return nomeMatch && dataInicioMatch && dataFimMatch && colaboradorMatch;
        });
    }

    function exportarParaExcel(dados) {
        const worksheet = XLSX.utils.json_to_sheet(dados);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Pontos");

        XLSX.writeFile(workbook, "pontos.xlsx");
    }

    carregarPontos();
});
