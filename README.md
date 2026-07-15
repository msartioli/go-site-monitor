<div align="center">

<img src="https://i.imgur.com/0ob02If.png" alt="Banner do Go Site Monitor" width="100%">

# Go Site Monitor

Aplicação de terminal desenvolvida em **Go** para monitorar a disponibilidade de sites e registrar os resultados em logs.

</div>

## Sobre o projeto

O **Go Site Monitor** lê uma lista de endereços do arquivo `sites.txt`, realiza requisições HTTP e informa se os sites estão online ou apresentam algum problema.

Cada verificação é registrada no arquivo `log.txt`, contendo:

* Data e horário da verificação
* Endereço do site
* Status online ou offline

## Funcionalidades

* Menu interativo no terminal
* Leitura de sites por arquivo `.txt`
* Monitoramento por requisições HTTP
* Verificação do código de status HTTP
* Registro automático de logs
* Consulta dos logs pelo próprio programa
* Logo personalizada no terminal
* Múltiplas rodadas de monitoramento

## Tecnologias utilizadas

* Go
* `net/http`
* `bufio`
* `os`
* `io`
* `strings`
* `strconv`
* `time`

## Estrutura do projeto

```text
go-site-monitor/
├── main.go
├── logo.txt
├── sites.txt
├── log.txt
└── README.md
```

| Arquivo     | Descrição                               |
| ----------- | --------------------------------------- |
| `main.go`   | Contém a lógica principal da aplicação  |
| `logo.txt`  | Contém a logo exibida no terminal       |
| `sites.txt` | Contém os sites que serão monitorados   |
| `log.txt`   | Armazena os resultados das verificações |
| `README.md` | Documentação do projeto                 |

## Como executar

### Pré-requisitos

É necessário ter o [Go](https://go.dev/) instalado.

Verifique a instalação com:

```bash
go version
```

### Clone o repositório

```bash
git clone https://github.com/msartioli/go-site-monitor.git
```

Entre na pasta do projeto:

```bash
cd go-site-monitor
```

Execute a aplicação:

```bash
go run main.go
```

## Configurando os sites

Adicione os endereços que deseja monitorar no arquivo `sites.txt`.

Coloque um endereço completo por linha:

```text
https://www.google.com/
https://www.github.com/
https://httpbin.org/status/200
https://httpbin.org/status/404
```

Os endereços devem começar com `http://` ou `https://`.

## Menu da aplicação

Ao executar o projeto, o seguinte menu será exibido:

```text
1 - Monitorar website
2 - Exibir logs
3 - Sair
```

### Opção 1 — Monitorar websites

Lê os endereços do arquivo `sites.txt` e verifica o status HTTP de cada site.

### Opção 2 — Exibir logs

Mostra no terminal as verificações registradas no arquivo `log.txt`.

### Opção 3 — Sair

Encerra a aplicação.

## Exemplo de monitoramento

```text
Começando monitoramento

Estou passando na posição 0 no site https://www.google.com/
Site: https://www.google.com/ foi carregado com sucesso!

Estou passando na posição 1 no site https://httpbin.org/status/404
Site: https://httpbin.org/status/404 está com problemas. Status Code: 404
```

## Exemplo de log

```text
15/07/2026 20:30:15 - https://www.google.com/ - online: true
15/07/2026 20:30:16 - https://httpbin.org/status/404 - online: false
```

## Conceitos praticados

* Funções
* Parâmetros
* Retorno de valores
* Variáveis e constantes
* Condicionais
* Estruturas de repetição
* Slices
* Tratamento de erros
* Leitura e escrita de arquivos
* Requisições HTTP
* Formatação de data e hora
* Conversão de tipos

## Próximas melhorias

* Adicionar timeout nas requisições HTTP
* Melhorar o tratamento de erros
* Retornar automaticamente ao menu
* Permitir configurar a quantidade de monitoramentos
* Permitir configurar o intervalo entre verificações
* Ignorar linhas vazias do arquivo `sites.txt`
* Organizar o código em diferentes arquivos e pacotes
* Criar testes automatizados

## Status

Projeto desenvolvido para praticar os fundamentos da linguagem Go.

## Autor

Desenvolvido por [Matheus Sartioli](https://github.com/msartioli).
