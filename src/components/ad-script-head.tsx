'use client';

import { useUser } from '@/firebase';
import Script from 'next/script';

export function AdScriptHead() {
    const { user } = useUser();
    const designatedAdminEmail = 'jupiterbania472@gmail.com';
    const isAdmin = user?.email === designatedAdminEmail;

    if (isAdmin) {
        return null;
    }

    return (
        <script type='text/javascript' src='//pl27958404.effectivegatecpm.com/47/2e/54/472e5469e9a7e3864565f60e6138e84e.js'></script>
    );
}
