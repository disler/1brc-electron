# 1 Billion Row Challenge with Electron, DuckDB, Prompts, Cursor and Aider
> Progressing our Agentic engineering abilities by building a 1 billion row challenge app with Electron, DuckDB, Prompts, Cursor and Aider

## Setup
- `yarn install`
- `cp .env.sample .env` - Update the .env file with your openai key
- `yarn run generate <number of rows>` - Generate the data
  - *'I wrote the generation script (scripts/createMeasurements.ts) to be memory efficient, but it still takes a while to generate the data.'*
  - *'On my M2 64gb ram 1 billion rows took ~8 minutes to generate'. Adjust accordingly.*
- `yarn run dev` - Start the app

### Resources
- Original Electron + Vite + Vue + Typescript [Starter](https://github.com/Deluze/electron-vue-template)
- [1 BRC Original](https://www.morling.dev/blog/one-billion-row-challenge/)
- [1 BRC DuckDB Post](https://rmoff.net/2024/01/03/1%EF%B8%8F%E2%83%A3%EF%B8%8F-1brc-in-sql-with-duckdb/)
- [Aider](https://aider.chat/)
- [Cursor](https://cursor.sh/)
- [Electron Vite Vue Typescript Starter](https://github.com/Deluze/electron-vue-template)
- [Vuetify Server Table](https://vuetifyjs.com/en/components/data-tables/server-side-tables/#examples)
- [Vuetify Pagination](https://vuetifyjs.com/en/components/paginations/#disabled)
- [Electron](https://www.electronjs.org/)

## DuckDB Commands
- `duckdb` - Start DuckDB Shell
- In the shell
  - `.open <database>` - Open a database
  - `.tables` - List all tables
  - `.schema <table>` - Show schema of a table
  - `.quit` - Quit the shell
  - `.help` - Show help
- `duckdb <path/to/database.duckdb>` - Start Shell with database
- `duckdb <path/to/database.duckdb> <sql statement>` - Run SQL statement on database
- `duckdb <path/to/database.duckdb> <duckdb command>` - Run DuckDb statement on database

## Generate the Data
- `yarn run generate <number of rows>`

## Duck DB Generation Commands
- Prove our agents did their jobs
  - `duckdb ./data/db.duckdb < ./data/agentOutput/generate-table.sql`
  - `duckdb ./data/db.duckdb .tables`
  - `duckdb ./data/db.duckdb from measurements limit 5`
  - `duckdb ./data/db.duckdb from brc limit 5`
- Run page table script
  - `bun ./data/agentOutput/pageTable.ts`

## Diagraming

### Tier 1 Detail

```mermaid
flowchart LR

    subgraph database

    end

    subgraph electron:main

    end

    subgraph electron:renderer

    end

     database <--> electron:main <--> electron:renderer 
```

### Tier 2 Detail

```mermaid
flowchart LR

    subgraph database
    subgraph duckdb tables
        d_a["brc: {station, min, max, mean}"]
        d_b["measurements: {station, measurement}"]
    end
        
    end

    subgraph electron:main
        em_a[src/main/turbo4.ts]
        em_b[scripts/createMeasurements.ts]
        em_c[src/main/main.ts]
    end

    subgraph electron:renderer
        er_a[src/renderer/App.vue]
    end

     database <--CRUD--> electron:main <--Communication vs Preload.ts--> electron:renderer 
```

### Tier 3 Knowledgebase
```mermaid
flowchart LR

    subgraph database
    subgraph duckdb tables
        d_a["brc: {station, min, max, mean}"]
        d_b["measurements: {station, measurement}"]
    end
        
    end

    subgraph electron:main
        em_a[src/main/turbo4.ts]
        em_b[scripts/createMeasurements.ts]
        em_c[src/main/main.ts]
    end

    subgraph electron:renderer
        er_a[src/renderer/App.vue]
    end

    subgraph knowledge_base
        kb_a[1brc OG Gunnar post]
        kb_b[1brc DuckDB post]
        kb_c[DuckDB Documentation]
    end

     database <--CRUD--> electron:main <--Communication Via Preload.ts--> electron:renderer 
     em_a <--build kb --> knowledge_base
```