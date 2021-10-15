<script context="module">
    export async function preload(page){
        return {user : page.params['user']};
    }
</script>
<script>
    export let user;
</script>
<svelte:head>
    <title>
        Covid 19 - {user}
    </title>
</svelte:head>
<div class="section header">
    <div class="container">
        <h1>
            Covid 19 - {user}
        </h1>
    </div>
</div>