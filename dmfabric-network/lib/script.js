/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* global getAssetRegistry getFactory emit */

/**
 * Create Service Request Transaction.
 * @param {org.dmfabric.res.CreateServiceReq} createServiceReq - the createServiceReq transaction
 * @transaction
 */
async function createServiceReq(createServiceReq) {  // eslint-disable-line no-unused-vars

    console.log('createServiceReq');
  
  
    const factory = getFactory();
    const NS_R = 'org.dmfabric.res';
    //const NS = 'org.acme.vehicle.lifecycle';

    const service = factory.newResource(NS_R, 'Service', createServiceReq.serviceId);
    service.serviceDetails = createServiceReq.serviceDetails;
    service.serviceReqStatus = 'REQUESTED';
    //service.requester = placeOrder.requester;
    service.requester = factory.newRelationship(NS_R, 'Resident', createServiceReq.requester.getIdentifier());

    // save the service request
    const registry = await getAssetRegistry(service.getFullyQualifiedType());
    await registry.add(service);
    const createServiceReqEvent = factory.newEvent(NS_R, 'CreateServiceReqEvent');
    createServiceReqEvent.serviceId = service.serviceId;
    createServiceReqEvent.serviceDetails = service.serviceDetails;
    emit(createServiceReqEvent);
}


/**
 * Publish Service Transaction.
 * @param {org.dmfabric.prov.PublishService} createServiceReq - the PublishService transaction
 * @transaction
 */
async function publishService(publishService) {  // eslint-disable-line no-unused-vars

    console.log('publishService'); 
  
    const factory = getFactory();
    const NS_R = 'org.dmfabric.res';
    const NS_P = 'org.dmfabric.prov';

    const service = factory.newResource(NS_R, 'Service', publishService.serviceId);
    service.serviceDetails = publishService.serviceDetails;
    service.serviceReqStatus = 'PUBLISHED';
    service.serviceProvider = factory.newRelationship(NS_P, 'ServiceProvider', publishService.serviceProvider.getIdentifier());

    // publish service offering
    const registry = await getAssetRegistry(service.getFullyQualifiedType());
    await registry.add(service);
    const publishServiceEvent = factory.newEvent(NS_P, 'PublishServiceEvent');
    publishServiceEvent.serviceId = service.serviceId;
    publishServiceEvent.serviceDetails = service.serviceDetails;
    emit(publishServiceEvent);
}


/**
 * Pick Up Service Transaction.
 * @param {org.dmfabric.prov.PickupServiceReq} pickupServiceReq - the PickupServiceReq transaction
 * @transaction
 */
async function pickupServiceReq(pickupServiceReq) {  // eslint-disable-line no-unused-vars

    console.log('pickupServiceReq'); 
  
    const factory = getFactory();
    const NS_P = 'org.dmfabric.prov';
    const NS_R = 'org.dmfabric.res';
    const registry = await getAssetRegistry(NS_R + '.Service');

    const service = await registry.get(pickupServiceReq.service.getIdentifier());
 
    service.serviceReqStatus = 'PROVIDER_PICKED_UP';
    service.serviceProvider = factory.newRelationship(NS_P, 'ServiceProvider', pickupServiceReq.serviceProvider.getIdentifier());
    await registry.update(service);

    // pick up service request
    const pickupServiceReqEvent = factory.newEvent(NS_P, 'PickupServiceReqEvent');
    pickupServiceReqEvent.service = pickupServiceReq.service;
    pickupServiceReqEvent.serviceReqStatus = service.serviceReqStatus;
    emit(pickupServiceReqEvent);
}

/**
 * Distribute Funds Transaction.
 * @param {org.dmfabric.gov.DistributeFunds} distributeFunds - the distributeFunds transaction
 * @transaction
 */
async function distributeFunds(distributeFunds) {  // eslint-disable-line no-unused-vars

    console.log('distributeFunds'); 
  
    const factory = getFactory();
    const NS_R = 'org.dmfabric.res';
    const NS_G = 'org.dmfabric.gov';
    const registry = await getAssetRegistry(NS_R + '.PaymentWallet');

    const wallet = await registry.get(distributeFunds.wallet.getIdentifier());
 
  	let current_bal = wallet.balance;
    wallet.balance = (current_bal) + (distributeFunds.fundAmount);
    //wallet.serviceProvider = factory.newRelationship(NS_P, 'ServiceProvider', pickupServiceReq.serviceProvider.getIdentifier());
    await registry.update(wallet);

    // distribute funds event
    const distributeFundsEvent = factory.newEvent(NS_G, 'DistributeFundsEvent');
    distributeFundsEvent.fundAmount = distributeFunds.fundAmount;
    distributeFundsEvent.wallet = distributeFunds.wallet;
  	distributeFundsEvent.governmentDept = distributeFunds.governmentDept;
    emit(distributeFundsEvent);
}



/**
 * Pay From Wallet for Service Transaction.
 * @param {org.dmfabric.res.PayFromWalletforService} payFromWalletforService - the payFromWalletforService transaction
 * @transaction
 */
async function payFromWalletforService(payFromWalletforService) {  // eslint-disable-line no-unused-vars

    console.log('payFromWalletforService'); 
  
    const factory = getFactory();
    const NS_P = 'org.dmfabric.prov';
    const NS_R = 'org.dmfabric.res';
    let service = payFromWalletforService.service;

    const registry = await getAssetRegistry(NS_R + '.Service');
   // const service = await registry.get(service.getIdentifier());

    //if (service.serviceReqStatus === 'SERVICE_RECEIVED') {
      
    	const residentRegistry = await getParticipantRegistry(NS_R + '.Resident');
        const resident = await residentRegistry.get(payFromWalletforService.service.requester.getIdentifier());
  
        const walletRegistry = await getAssetRegistry(NS_R + '.PaymentWallet');
    	const wallet = await walletRegistry.get(resident.walletId);

        let paymentAmt = service.serviceDetails.price;
      	let current_balance = wallet.balance;
        wallet.balance = (current_balance) - (paymentAmt);
      //call for fund transfer to service provider account
      await walletRegistry.update(wallet);
      
      service.serviceReqStatus = 'PAYMENT_DONE';
      await registry.update(service);

      // service status update
      const updateServiceReqEvent = factory.newEvent(NS_R, 'UpdateServiceReqEvent');
      updateServiceReqEvent.service = payFromWalletforService.service;
      updateServiceReqEvent.serviceReqStatus = service.serviceReqStatus;
      emit(updateServiceReqEvent);
      
    //} 
}
