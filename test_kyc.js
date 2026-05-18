

async function test() {
  const url = "https://api.sand.etherfuse.com/ramp/customer/8b6287ac-59a7-46d9-aa46-625112bd36d2/kyc";
  const apiKey = "api_sand:8cd52ff5-ae77-41fc-8478-37e08af9ce9f:f027b571-3913-479c-a548-6c76cb314d92";
  
  const payload = {
    identity: {
      id: "8b6287ac-59a7-46d9-aa46-625112bd36d2",
      email: "user@walletnow.app",
      idNumbers: [{ value: "12345678909", type: "CPF" }],
      name: {
        givenName: "João",
        familyName: "Silva"
      },
      dateOfBirth: "1990-01-01",
      occupation: "Software Engineer",
      phoneNumber: "+5511999999999",
      address: {
        street: "Rua Ficticia, 123",
        city: "São Paulo",
        region: "SP",
        postalCode: "01000-000",
        country: "BR"
      }
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  console.log("STATUS:", response.status);
  console.log("BODY:", text);
}

test();
