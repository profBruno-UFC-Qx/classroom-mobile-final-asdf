[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/AR7CADm8)
[![Open in Codespaces](https://classroom.github.com/assets/launch-codespace-2972f46106e565e64193e422d61a12cf1da4916b45550586e14ef0a7c637dd04.svg)](https://classroom.github.com/open-in-codespaces?assignment_repo_id=23362550)

# :checkered_flag: COFI - Controle Financeiro

Aplicativo Android para controle financeiro pessoal, desenvolvido como complemento mobile à aplicação web já existente.

## :technologist: Membros da equipe

Lucas Almeida - 495 000

## :bulb: Objetivo Geral

Desenvolver o aplicativo Android do COFI — Controle Financeiro, como complemento à aplicação web já existente. Este projeto foi desenvolvido como parte da disciplina de desenvolvimento mobile.

## :eyes: Público-Alvo

Pessoas que desejam organizar e acompanhar suas finanças pessoais de forma simples e eficiente.

## :star2: Impacto Esperado

Auxiliar o usuário a ter maior controle e consciência sobre seus gastos, contribuindo para uma melhor saúde financeira.

## :triangular_flag_on_post: Principais funcionalidades da aplicação

- _Funcionalidades do usuário não logado_
  - Usuário pode criar conta
- _Funcionalidades do usuário logado_
  - Listar as contas
  - Separar as contas por cartão de crédito
  - Ver o fluxo de caixa da pessoa
  - Filtrar os gastos de acordo com categoria e modo de pagamento

---

> [!WARNING]
> Daqui em diante o README.md só deve ser preenchido no momento da entrega final.

## Tecnologias:

- Kotlin 2.4
- Jetpack Compose (BOM 2026.06)
- Navigation 3
- Hilt 2.60 (injeção de dependência)
- Room 2.8 (persistência local)
- Retrofit 3 + OkHttp 5 (networking)
- DataStore Preferences (armazenamento de tokens)
- Junit (Testes unitários e Testes instrumentais)

---

## Instruções para Execução

**Backend:**

```bash
cd backend
make dev
```

**Frontend:**

```bash
cd frontend
npm start
```

**Mobile:**

Abra a pasta `classroom-mobile-final-asdf` no Android Studio. Aguarde o Gradle Sync baixar as dependências (**File → Sync Project with Gradle Files**). Com um dispositivo ou emulador conectado, clique em **Run** para instalar e executar o app.

**Usuário Teste**

- Email: `lucas@mail.com`
- Password: `asdfasdf`
