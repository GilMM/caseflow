export default function RootPage() {
  // Server-rendered content for SEO before redirect
  // Google may index this page, so include essential links
  return (
    <>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
      }}>
        <h1>CaseFlow</h1>
        <p>Professional case management system</p>
        <p style={{ marginTop: '20px' }}>
          <a href="/en" style={{ color: '#1677ff', marginRight: '20px' }}>Enter Site</a>
          <a href="/en/privacy" style={{ color: '#1677ff', marginRight: '20px' }}>Privacy Policy</a>
          <a href="/en/terms" style={{ color: '#1677ff' }}>Terms of Service</a>
        </p>
      </div>
      <script dangerouslySetInnerHTML={{ __html: `window.location.href='/en';` }} />
    </>
  );
}
