# Queimada Aero — versão TikTok (GitHub + Render)

O jogo roda num servidor grátis do Render, que lê a sua live do TikTok
(comentários, likes e presentes) e manda tudo pro jogo em tempo real.

## Arquivos
- `index.html` — o jogo
- `server.js` — o servidor que lê a live
- `package.json` — configuração para o Render
- `LEIA-ME.md` — este guia

## 1. GitHub (pelo navegador do celular)
1. Entre em github.com e faça login.
2. Toque em **+** → **New repository**. Nome: `queimada-aero`. Pode deixar **Private**. Toque em **Create repository**.
3. Na página do repositório, toque em **uploading an existing file**
   (ou **Add file → Upload files**). Se não aparecer, ative **Versão para computador** no navegador.
4. Selecione os 4 arquivos de uma vez e toque em **Commit changes**.

## 2. Render
1. Entre em render.com e faça login com a conta do GitHub.
2. Toque em **New +** → **Web Service** e escolha o repositório `queimada-aero`.
3. Preencha:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. **Environment Variables** (opcional): se quiser, adicione
   - **Key:** `TIKTOK_USER`
   - **Value:** o seu @ do TikTok (ele nunca muda, então é só colocar uma vez).
   Se deixar vazio, você conecta pelo próprio jogo na hora da live (passo 3).
5. Toque em **Deploy Web Service** e espere terminar (alguns minutos).
6. O Render mostra o seu link, algo como `https://queimada-aero.onrender.com`.

## 3. Na hora da live
1. Abra a live no TikTok primeiro (**+ → LIVE → Mobile gaming**).
2. Abra o link do Render no navegador do celular.
   - Toque em **⚙ Chat**, cole o **link da live** (ou o seu @) e toque em **Conectar**.
   - Aparece "TikTok: conectado na live de @voce ✅". O jogo lembra o último link usado.
   - Se a live ainda não tinha começado, o servidor tenta de novo a cada 30 segundos.
3. Volte pro TikTok, toque em **Go LIVE** e aceite transmitir a tela; depois volte pro navegador com o jogo.

## O que o público pode fazer
- Comentar `entrar`, `azul` ou `verde` para entrar no jogo (com ou sem `!`)
- `jogar` / `!jogar @nome` — quem estiver com a bola joga
- `desviar` — bolha de proteção
- `especial` — ricochete quando a barra ⚡ estiver cheia
- Likes e presentes (rosa = +15%) carregam o ⚡ Especial do time de quem mandou.
  Quem não está jogando ajuda o time que está perdendo.

## Bom saber
- **Plano grátis do Render:** o servidor dorme depois de 15 minutos sem uso. Abra o link uns
  minutos antes da live; a primeira abertura pode demorar ~1 minuto. Com o jogo aberto, ele se mantém acordado.
- **Celular:** o jogo liga sozinho o **🪶 Modo leve** (menos efeitos, mais fluido).
  Pra desligar, toque no botão ou use `?leve=0` no fim do link.
- **Links úteis:** `/status` mostra se está conectado; `/reconectar` força uma nova tentativa.
- A leitura da live usa a biblioteca `tiktok-live-connector`, que não é oficial do TikTok.
  Se o TikTok mudar algo e parar de conectar, no Render use **Manual Deploy → Clear build cache & deploy**
  para baixar a versão mais nova.
