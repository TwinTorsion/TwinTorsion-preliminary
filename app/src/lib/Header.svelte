<script>
    import { version } from '$app/environment'
</script>
<div class="main-header">
    <a href="/" class="logo-cont">
        <img class="main-logo" src="./../icon.svg" alt="TwinTorsion Editor Logo">
        TwinTorsion Editor <sub>{version}</sub>
    </a>
    <p class="links">
        <a href="https://github.com/TwinTorsion/TwinTorsion-preliminary/wiki/User-Guide">
            User Guide
        </a>
        <a href="https://github.com/TwinTorsion/TwinTorsion-preliminary">
            GitHub
        </a>
    </p>
</div>
<style>
    .main-header {
        border-radius: var(--main-border-radius);
        background: white;
        position: fixed;
        top:10px;
        left: calc(50vw - 550px);
        width: 1100px;
        height: 68px;
        border: var(--main-border);
        z-index: 10000;
        display: flex;
        justify-content: space-between;
    }
    .main-logo {
        width: 36px;
        height: 36px;
        display: block;
        margin-right: 10px;
    }
    .logo-cont {
        display: flex;
        align-items: center;
        height: 100%;
        margin: 0 24px;
        text-decoration: none;
        font-weight: 550;
    }
    .logo-cont sub {
        font-size: 10px;
        position: relative;
        top: -3.5px;
        left: 3px;
        color: rgba(0, 0, 0, 0.6);
    }
    .links {
        display: flex;
        gap: 20px;
        margin: 0 24px;
        align-items: center;
    }
    .links a {
        text-decoration: none;
        font-size: 14px;
    }

    @media (max-width: 1100px) {
        .main-header {
            width: calc(100% - 20px);
            left: 10px;
        }
        .links {
            display: none;
        }
    }
</style>