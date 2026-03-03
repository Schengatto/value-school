<script setup lang="ts">
const props = defineProps<{
  assetProfile: Record<string, any> | null
}>()

const officers = computed(() => {
  return (props.assetProfile?.companyOfficers ?? []).slice(0, 10)
})
</script>

<template>
  <div v-if="assetProfile">
    <div v-if="officers.length">
      <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{{ $t('governanceSection.executiveTeam') }}</h4>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th class="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">{{ $t('governanceSection.name') }}</th>
              <th class="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">{{ $t('governanceSection.title') }}</th>
              <th class="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">{{ $t('governanceSection.age') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="officer in officers" :key="officer.name" class="border-t border-gray-100 dark:border-gray-700">
              <td class="px-3 py-2 text-gray-900 dark:text-gray-100">{{ officer.name }}</td>
              <td class="px-3 py-2 text-gray-600 dark:text-gray-400">{{ officer.title }}</td>
              <td class="px-3 py-2 text-gray-600 dark:text-gray-400">{{ officer.age ?? '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="assetProfile.auditRisk" class="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="bg-gray-50 dark:bg-gray-800 rounded p-3 text-center">
        <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('governanceSection.auditRisk') }}</p>
        <p class="text-lg font-semibold">{{ assetProfile.auditRisk ?? '-' }}</p>
      </div>
      <div class="bg-gray-50 dark:bg-gray-800 rounded p-3 text-center">
        <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('governanceSection.boardRisk') }}</p>
        <p class="text-lg font-semibold">{{ assetProfile.boardRisk ?? '-' }}</p>
      </div>
      <div class="bg-gray-50 dark:bg-gray-800 rounded p-3 text-center">
        <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('governanceSection.compensationRisk') }}</p>
        <p class="text-lg font-semibold">{{ assetProfile.compensationRisk ?? '-' }}</p>
      </div>
      <div class="bg-gray-50 dark:bg-gray-800 rounded p-3 text-center">
        <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('governanceSection.shareholderRightsRisk') }}</p>
        <p class="text-lg font-semibold">{{ assetProfile.shareHolderRightsRisk ?? '-' }}</p>
      </div>
    </div>
  </div>
</template>
