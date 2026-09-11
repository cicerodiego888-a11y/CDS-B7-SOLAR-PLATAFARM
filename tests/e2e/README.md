# E2E

Os testes usam o runner nativo do Node e `fetch`, sem dependência adicional. Eles exercitam um ambiente E2E isolado e nunca executam seed, migration ou reset automaticamente.

Configure `E2E_BASE_URL`, `E2E_EMAIL` e `E2E_PASSWORD` para executar os fluxos autenticados. `E2E_PLANT_ID`, `E2E_INVERTER_ID` e `E2E_ALERT_ID` habilitam os fluxos de recurso/lifecycle. `E2E_OTHER_PLANT_ID` pode ser usado por um usuário `CUSTOMER` para validar isolamento.

Comando: `pnpm test:e2e`.

Para subir a infraestrutura isolada: `pnpm e2e:up`, `pnpm e2e:migrate`, `pnpm e2e:seed`. Inicie a API apontando `DATABASE_URL` para `postgresql://b7_e2e:b7_e2e_password@localhost:55432/b7_solar_e2e` e Redis para `localhost:56379`, depois execute `pnpm e2e:run`. Finalize com `pnpm e2e:down`.

Sem `E2E_BASE_URL`, os testes ficam explicitamente pulados. Isso evita confundir a suíte com um servidor de desenvolvimento ou banco de produção.
