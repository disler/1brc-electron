<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ipcRenderer } from "electron";

interface Pagination {
  page: number;
  itemsPerPage: number;
  table: string;
}

interface BrcRow {
  station: string;
  min: number;
  mean: number;
  max: number;
  measurement: string;
}
const brcRows = ref<BrcRow[]>([]);

const headers = [
  {
    align: "center",
    title: "Station",
    sortable: false,
    value: "station",
    table: "brc",
  },
  {
    align: "center",
    title: "Station",
    sortable: false,
    value: "station_name",
    table: "measurements",
  },
  { align: "center", title: "Min", value: "min", table: "brc" },
  { align: "center", title: "Mean", value: "mean", table: "brc" },
  { align: "center", title: "Max", value: "max", table: "brc" },
  {
    align: "center",
    title: "Measurement",
    value: "measurement",
    table: "measurements",
  },
];

const brcHeaders = headers.filter((header) => header.table === "brc");
const measurementsHeaders = headers.filter(
  (header) => header.table === "measurements"
);

const totalItems = ref(1000000000);
const loading = ref(false);
const search = ref("");
const itemsPerPage = ref(10);
const page = ref(1);
const table = ref("brc");
const tables = ref(["brc", "measurements"]);
const selectedTable = ref("brc");
import { watch } from "vue";

function loadItems() {
  const pagination: Pagination = {
    table: table.value,
    page: page.value,
    itemsPerPage: itemsPerPage.value,
  };

  window.electronAPI.getBrcPage(pagination);

  loading.value = true;
}
onMounted(() => {
  window.electronAPI.on("getBrcPageResponse", (data, payload) => {
    loading.value = false;
    brcRows.value = payload;
    console.log("Data received from main process:", payload);
  });
  window.electronAPI.getBrcPage({
    table: table.value,
    itemsPerPage: itemsPerPage.value,
    page: page.value,
  });
});

watch(page, () => {
  loadItems();
});
watch(selectedTable, (newTable) => {
  table.value = newTable;
  loadItems();
});

function getBrcPage(params) {
  window.electronAPI.getBrcPage(params);
}
</script>

<template>
  <div>
    <h1>1 Billion Row Challenge - Electron Edition</h1>
    <v-select
      v-model="selectedTable"
      :items="tables"
      label="Select Table"
      @change="loadItems"
    ></v-select>
    <v-data-table-server
      v-model:items-per-page="itemsPerPage"
      :headers="table === 'brc' ? brcHeaders : measurementsHeaders"
      :items-length="totalItems"
      :items="brcRows"
      :loading="loading"
      :search="search"
      item-value="name"
      :items-per-page-options="[10, 100, 1000, 10000, 100000]"
      @update:options="loadItems"
      :height="500"
    ></v-data-table-server>
    <v-pagination
      v-model="page"
      :length="Math.ceil(totalItems / itemsPerPage)"
      @input="loadItems"
    ></v-pagination>
  </div>
</template>

<style scoped></style>
