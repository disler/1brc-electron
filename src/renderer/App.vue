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
const brcRows = ref<BrcRow[]>([
  {
    station: "Station 1",
    min: 10,
    mean: 20,
    max: 30,
    measurement: "Measurement 1",
  },
  {
    station: "Station 2",
    min: 11,
    mean: 21,
    max: 31,
    measurement: "Measurement 2",
  },
  {
    station: "Station 3",
    min: 12,
    mean: 22,
    max: 32,
    measurement: "Measurement 3",
  },
  {
    station: "Station 4",
    min: 13,
    mean: 23,
    max: 33,
    measurement: "Measurement 4",
  },
  {
    station: "Station 5",
    min: 14,
    mean: 24,
    max: 34,
    measurement: "Measurement 5",
  },
  {
    station: "Station 6",
    min: 15,
    mean: 25,
    max: 35,
    measurement: "Measurement 6",
  },
  {
    station: "Station 7",
    min: 16,
    mean: 26,
    max: 36,
    measurement: "Measurement 7",
  },
  {
    station: "Station 8",
    min: 17,
    mean: 27,
    max: 37,
    measurement: "Measurement 8",
  },
  {
    station: "Station 9",
    min: 18,
    mean: 28,
    max: 38,
    measurement: "Measurement 9",
  },
  {
    station: "Station 10",
    min: 19,
    mean: 29,
    max: 39,
    measurement: "Measurement 10",
  },
]);

const headers = [
  { text: "Station", align: "start", sortable: false, value: "station" },
  { text: "Min", value: "min" },
  { text: "Mean", value: "mean" },
  { text: "Max", value: "max" },
  { text: "Measurement", value: "measurement" },
];

const totalItems = ref(1000000);
const loading = ref(false);
const search = ref("");
const itemsPerPage = ref(10);
const page = ref(1);
const table = ref("brc");

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

function getBrcPage(params) {
  window.electronAPI.getBrcPage(params);
}
</script>

<template>
  <div>
    <h1>1 Billion Row Challenge - Electron Edition</h1>
    <v-data-table-server
      v-model:items-per-page="itemsPerPage"
      :headers="headers"
      :items-length="totalItems"
      :items="brcRows"
      :loading="loading"
      :search="search"
      item-value="name"
      @update:options="loadItems"
    ></v-data-table-server>
    <v-pagination
      v-model="page"
      :length="Math.ceil(totalItems / itemsPerPage)"
      @input="loadItems"
    ></v-pagination>
  </div>
</template>

<style scoped></style>
