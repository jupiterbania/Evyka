'use client';

import { useUser } from '@/firebase';

export function AdScriptBody() {
    const { user } = useUser();
    const designatedAdminEmail = 'jupiterbania472@gmail.com';
    const isAdmin = user?.email === designatedAdminEmail;

    if (isAdmin) {
        return null;
    }

    return (
        <script type='text/javascript' src='//pl27958400.effectivegatecpm.com/12/55/62/1255623bad89bb132fff6306d12044ad.js'></script>
    );
}
