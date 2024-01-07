<script setup lang="ts">
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
</script>

<template>
  <div>
    <h1>1 Billion Row Challenge - Electron Edition</h1>
  </div>
</template>

<style scoped></style>
