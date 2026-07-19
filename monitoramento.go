package main

import (
	"bufio"
	"fmt" // responsavel por entrada e saida de comandos
	"io"
	"net/http" // responsavel por comunicar com protocologos web
	"os"       // responsavel por falar com o sistema operacional
	"strconv"
	"strings"
	"time" // responsavel por tempo e delays
)

const delay = 5 * time.Second // delay de 5 segundos
const monitoramento = 3       // vai monitorar 3 vezes

func main() {
	exibirLogo()
	exibirMenu()

}

func exibirLogo() {
	logo, err := os.ReadFile("logo.txt")

	if err != nil {
		fmt.Println("Não foi possível carregar a logo:", err)
		return
	}

	fmt.Println(string(logo))
}

func exibirMenu() {
	fmt.Println("1 - Monitorar website")
	fmt.Println("2 - Exibir logs")
	fmt.Println("3 - Sair")

	opcao := 0

	fmt.Print("Digite sua opção: ")
	fmt.Scan(&opcao)

	switch opcao {
	case 1:
		iniciarMonitoramento()
	case 2:
		imprimirLogs()
		fmt.Println("Exibindo logs...")
	case 3:
		fmt.Println("Saindo...")
		os.Exit(0)
	default:
		fmt.Println("Opção inválida. Tente novamente.")
		os.Exit(-1)
	}
}

func iniciarMonitoramento() {
	fmt.Println("Começando monitoramento")
	// sites := []string{"https://alura.com.br/", "https://www.google.com/", "https://httpbin.org/status/200", "https://httpbin.org/status/404", "https://httpbin.org/status/500"} // código reformulado para nova versão em txt
	sites := leArquivo()
	for i := 0; i < monitoramento; i++ {
		for i, site := range sites {
			fmt.Println("Estou passando na posição", i, "no site", site)
			testarSites(site, true)
			fmt.Println("")
			//time.Sleep(delay)
			fmt.Println("")
		}
	}
}

func testarSites(site string, status bool) {
	resp, err := http.Get(site) // mas essa funcao e responsavel por testar os codigos

	if err != nil { // pegando a variavel do http "err" que eles nos tras o http a resposta e o err, iremos tratar ela aqui, se ela der err e for diferente ou igual a nil então vamos passar uma mensagem avisando
		fmt.Println("Ocorreu um erro:", err)
	}

	if resp.StatusCode == 200 { // pegando a variavel do nosso http com statuscode 200 sinaliza que o site está ok
		fmt.Println("Site:", site, "foi carregado com sucesso!")
		registraLog(site, true)
	} else {
		fmt.Println("Site:", site, "esta com problemas. Status Code:", resp.StatusCode) // aqui mesma coisa
		registraLog(site, false)                                                      
	}
}

func leArquivo() []string {
	var sites []string
	arquivo, err := os.Open("sites.txt")
	if err != nil {
		fmt.Println("Ocorreu um erro", err, "Com o arquivo", arquivo)
	}
	leitor := bufio.NewReader(arquivo)
	for {
		linha, err := leitor.ReadString('\n')
		linha = strings.TrimSpace(linha)
		sites = append(sites, linha)
		fmt.Println(linha)
		if err == io.EOF {
			break
		}
		fmt.Println(sites, "\n")

	}
	return sites
}

func registraLog(site string, status bool) {

	arquivo, err := os.OpenFile("log.txt", os.O_RDWR|os.O_CREATE|os.O_APPEND, 0666) // usar o openfile que é uma versão mais poderosa do Open, nela ele passou os comando para criar arquivo se não existir escrever arquivos, e precisa da permisão, não sei por que tem que ser 0666 e quando usar se for outra

	if err != nil { // tratamento de erro do openfile
		fmt.Println(err)
	}

	arquivo.WriteString(time.Now().Format("02/01/2006 15:04:05") + " - " + site + " - online: " + strconv.FormatBool(status) + "\n")

	arquivo.Close() // boas praticas
}

func imprimirLogs() {

	arquivo, err := os.ReadFile("log.txt")

	if err != nil {
		fmt.Println(err)
	}

	fmt.Println(string(arquivo)) // converter de bytes para string

}
